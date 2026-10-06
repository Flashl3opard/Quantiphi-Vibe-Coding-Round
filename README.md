# Taskboard

A Kanban-style task management app in the shape of Jira: projects contain tasks, tasks move
across three columns, and a workload indicator flags team members who are overloaded. Built with
Next.js (App Router), a custom REST API over Prisma, and Postgres (Supabase).

## Contents

- [Problem statement](#problem-statement)
- [Architecture](#architecture)
- [Data model](#data-model)
- [Core logic](#core-logic)
  - [Drag-and-drop reordering](#drag-and-drop-reordering)
  - [Workload balancing](#workload-balancing)
- [API reference](#api-reference)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Local development](#local-development)
- [Deploying to Vercel](#deploying-to-vercel)
- [Known limitations](#known-limitations)

## Problem statement

The brief asked for a personal/team task manager with:

1. A three-column Kanban board (`To-Do`, `In Progress`, `Done`) with drag-and-drop.
2. Task cards carrying priority, due date, and description.
3. Controls to create tasks, add users to a project, and filter by priority.
4. A custom CRUD API (not a third-party backend) backing task state and user associations.
5. Relational data in Postgres modeling `projects -> tasks` and user/project membership.
6. A workload-balancing signal: any user with more than five tasks in `In Progress` should have
   their avatar pulse red wherever the team is listed.

Everything below is the implementation of that brief, plus the reasoning behind each decision.

## Architecture

The app is a single Next.js project. Server Components read the database directly for the first
paint (no network hop); the board itself is a Client Component that talks to a small set of REST
route handlers, backed by Prisma, for everything after that.

```mermaid
flowchart LR
    subgraph Browser
        UI["Board UI (Client Components)\ndnd-kit + TanStack Query"]
    end

    subgraph Server["Next.js server (App Router)"]
        RSC["Server Components\n(app/page.tsx, app/board/.../page.tsx)"]
        API["Route Handlers\n(app/api/**)"]
    end

    DB[("Postgres\n(Supabase)")]

    UI -- "fetch /api/*" --> API
    RSC -- "initial read" --> DB
    API -- "Prisma Client\n(@prisma/adapter-pg)" --> DB
    RSC -- "hydrates" --> UI
```

Why this split:

- **Server-rendered first paint.** The board route (`app/board/[projectId]/page.tsx`) fetches the
  project, its members, its tasks, and the full project list on the server, then passes them into
  the client board as React Query `initialData`. The page is usable before any client-side fetch
  resolves, and React Query takes over from there for mutations and cache invalidation.
- **One CRUD surface.** All writes (create/update/delete task, add/remove member, create
  user/project) go through `app/api/**` route handlers that speak directly to Prisma. There is no
  separate backend service — the API *is* the Next.js server, which satisfies "custom CRUD API"
  without introducing a second deployable.

## Data model

```mermaid
erDiagram
    USER {
      string id
      string name
      string email
      string avatarColor
    }
    PROJECT {
      string id
      string name
      string description
      string ownerId
    }
    PROJECT_MEMBER {
      string id
      string projectId
      string userId
      string role
    }
    TASK {
      string id
      string projectId
      string title
      string description
      string status
      string priority
      datetime dueDate
      int position
      string assigneeId
    }

    USER ||--o{ PROJECT : owns
    USER ||--o{ PROJECT_MEMBER : "is a member via"
    PROJECT ||--o{ PROJECT_MEMBER : has
    PROJECT ||--o{ TASK : contains
    USER ||--o{ TASK : "is assigned"
```

Notes on the schema (`prisma/schema.prisma`):

- `ProjectMember` is the join table that gives "add users to projects" and permissions a real
  relational home, rather than a flat array on `Project`. It carries a `role` (`OWNER` / `MEMBER`);
  the owner cannot be removed from their own project.
- `Task.status` is an enum (`TODO` / `IN_PROGRESS` / `DONE`) — this *is* the column a task renders
  in, so the board never needs a separate "column" concept.
- `Task.position` is an integer scoped to `(projectId, status)`. It is what makes drag-and-drop
  ordering stable and is maintained entirely server-side (see below).
- Removing a member sets their assigned tasks' `assigneeId` to `null` rather than deleting the
  tasks (`onDelete: SetNull`), so work doesn't disappear when someone leaves a project.

## Core logic

### Drag-and-drop reordering

The board is one `DndContext` (dnd-kit) with one `SortableContext` per column. Dropping a card
needs to do two things atomically: move it to the right status, and give it the right position
relative to its new neighbors — without disturbing the relative order of every other task in that
column.

```mermaid
sequenceDiagram
    participant User
    participant Board as Board (client)
    participant Cache as React Query cache
    participant API as PATCH /api/tasks/:id
    participant DB as Postgres (transaction)

    User->>Board: drops card on a column/card
    Board->>Cache: optimistic reorder (instant UI update)
    Board->>API: { status, position }
    API->>DB: load destination column's siblings
    API->>DB: splice task in at `position`, renumber 0..n
    DB-->>API: updated rows
    API-->>Board: confirmed task
    alt request fails
        Board->>Cache: roll back to pre-drag snapshot
    else request succeeds
        Board->>Cache: reconcile with server state
    end
```

Implementation details (`app/api/tasks/[taskId]/route.ts`):

- The client never computes absolute positions across columns. It sends the destination
  `status` and the *index* the card should land at within that column.
- The server loads every other task already in that destination column, splices the moving task
  in at the requested index, and re-writes `position` as a dense `0..n` sequence inside a single
  `prisma.$transaction`. The source column's positions are left untouched — gaps there are
  harmless because ordering only ever reads `position` relative to other rows in the same status.
- `lib/hooks.ts` (`useMoveTask`) applies the same splice-and-renumber logic to the local React
  Query cache *before* the request resolves, so the card snaps into place immediately. On failure
  it restores the pre-drag snapshot; on success the query is invalidated to reconcile with the
  authoritative server state.
- Dragging is disabled whenever a priority filter is active. The filter hides cards client-side,
  and allowing a drop against a partially-hidden column would compute an index that doesn't match
  the true, unfiltered column order on the server — so the UI asks the user to clear the filter
  first rather than risk silently reordering hidden cards.

### Workload balancing

```mermaid
flowchart TD
    A["Tasks for the project\n(always unfiltered)"] --> B{"status == IN_PROGRESS\nand has an assignee?"}
    B -- no --> Z[ignore]
    B -- yes --> C["increment count for assignee.id"]
    C --> D{"count > 5?"}
    D -- yes --> E["render avatar with\nanimate-avatar-pulse class"]
    D -- no --> F["render avatar normally"]
```

This is computed client-side in `components/TeamList.tsx` with a single `useMemo` over the
project's full task list — grouping by `assigneeId` where `status === "IN_PROGRESS"`. It
deliberately ignores the active priority filter: workload reflects a person's *actual* load, not
whatever subset of cards happens to be visible. Crossing the threshold (`WORKLOAD_LIMIT = 5` in
`lib/types.ts`) adds a Tailwind class driving a `@keyframes avatar-pulse` animation defined in
`app/globals.css`, which cycles the avatar's background color and box-shadow. The member's
in-progress count is also shown as a small badge on the avatar at all times, so the pulse is a
reinforcement of a visible number, not the only signal.

## API reference

All routes live under `app/api/` and return JSON. Validation is done with Zod
(`lib/validators.ts`) before anything touches the database.

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/projects` | List projects with owner, members, and task count |
| POST | `/api/projects` | Create a project (creator becomes `OWNER`) |
| GET | `/api/projects/:projectId` | Get one project with members |
| GET | `/api/projects/:projectId/members` | List project members |
| POST | `/api/projects/:projectId/members` | Add an existing user to a project |
| DELETE | `/api/projects/:projectId/members/:userId` | Remove a member (not the owner) |
| GET | `/api/projects/:projectId/tasks` | List tasks, optional `?priority=` filter |
| POST | `/api/projects/:projectId/tasks` | Create a task (appended to its column) |
| PATCH | `/api/tasks/:taskId` | Update fields, and/or move/reorder via `status`/`position` |
| DELETE | `/api/tasks/:taskId` | Delete a task |
| GET | `/api/users` | List all users |
| POST | `/api/users` | Create a user (assigned the next avatar color) |

## Tech stack

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 16 (App Router, Turbopack) | Server Components for first paint + colocated API routes |
| Language | TypeScript | Shared types between API and UI (`lib/types.ts`) |
| Database | PostgreSQL (Supabase) | Relational hierarchy, enums for status/priority, single managed instance that works both locally and from Vercel |
| ORM | Prisma 7 (`@prisma/adapter-pg` driver adapter) | Typed queries and migrations; the driver adapter talks to Supabase's pooled connection, which is required for serverless |
| Validation | Zod | Runtime validation of every API request body |
| Data/cache | TanStack Query | Optimistic updates, cache invalidation, `initialData` hydration from the server |
| Drag-and-drop | dnd-kit (`core` + `sortable`) | Accessible, actively maintained, works with React 19 |
| Styling | Tailwind CSS v4 | Utility styling plus a custom `@keyframes` for the workload pulse |

## Project structure

```
app/
  page.tsx                       Redirects to the first project's board
  board/[projectId]/page.tsx     Server Component: loads project/tasks/members/users
  api/
    projects/route.ts
    projects/[projectId]/route.ts
    projects/[projectId]/members/route.ts
    projects/[projectId]/members/[userId]/route.ts
    projects/[projectId]/tasks/route.ts
    tasks/[taskId]/route.ts
    users/route.ts
components/
  BoardClient.tsx       Board state, DnD wiring, dialogs
  Column.tsx            Droppable column + SortableContext
  TaskCard.tsx           Draggable card
  TeamList.tsx           Avatars + workload pulse
  TaskDialog.tsx         Create/edit task form
  AddMemberDialog.tsx    Add existing or new user to a project
  PriorityFilter.tsx
  ProjectSwitcher.tsx
  Modal.tsx / Avatar.tsx Reusable primitives
lib/
  prisma.ts         Prisma Client + pg driver adapter singleton
  validators.ts     Zod schemas
  types.ts          Shared types, status/priority constants
  api-client.ts      fetch wrappers used by the hooks
  hooks.ts          TanStack Query hooks (including optimistic move)
prisma/
  schema.prisma
  seed.ts           Demo project, users, and a deliberately overloaded user
prisma.config.ts    Prisma CLI config (Prisma 7 moved connection config out of schema.prisma)
docker-compose.yml  Optional local Postgres, if you'd rather not use Supabase for dev
```

## Local development

The app is wired for Supabase Postgres, which is also what you'll point Vercel at in production —
one database, no drift between environments.

1. Create a project at [supabase.com](https://supabase.com) (or use an existing one).
2. In **Project Settings -> Database -> Connection string**, copy the pooled connection string
   (transaction mode, port 6543) and the direct connection string (port 5432).
3. Fill in `.env` (already scaffolded with placeholders):

   ```
   DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
   ```

   `DATABASE_URL` (pooled) is what the running app uses at request time — Vercel's serverless
   functions each open their own connection, and the pooler is what keeps that from exhausting
   Supabase's connection limit. `DIRECT_URL` is used only by the Prisma CLI (`db push`, `studio`,
   the seed script), which needs a direct session rather than a transaction-mode pooler.

4. Install dependencies and push the schema:

   ```bash
   npm install
   npm run db:push
   npm run db:seed
   npm run dev
   ```

5. Open `http://localhost:3000` — it redirects to the seeded demo project's board.

The seed script (`prisma/seed.ts`) creates four users, one project with all four as members, and a
spread of tasks across all three columns — including one user deliberately given six
`IN_PROGRESS` tasks so the workload pulse is visible immediately.

### Alternative: local Postgres without Supabase

If you want to develop without a Supabase project (e.g. offline), `docker-compose.yml` spins up a
local Postgres instead:

```bash
npm run db:up   # docker compose up -d
```

Then set `DATABASE_URL` and `DIRECT_URL` in `.env` to
`postgresql://quantiphi:quantiphi@localhost:5432/quantiphi?schema=public` and continue from step 4
above. Switch back to the Supabase URLs before deploying.

## Deploying to Vercel

1. Push the repository to GitHub (or your git host of choice).
2. Import the project in Vercel.
3. Add `DATABASE_URL` and `DIRECT_URL` as environment variables in the Vercel project settings,
   using the same Supabase values as your local `.env`.
4. Deploy. No build configuration changes are needed — `next build` already runs cleanly against
   a reachable database; `prisma generate` runs automatically via the `postinstall` lifecycle that
   Prisma's own package wires up.
5. Run `npm run db:push` once against the Supabase project (from your machine, pointed at the same
   `DIRECT_URL`) before the first deploy, so the schema exists before the app queries it.

## Known limitations

- **No authentication.** Users are a shared directory, not accounts with logins — there's no
  session tied to "who you are," so anyone can act as any user. Adding real auth (e.g. Supabase
  Auth) would mean gating the user-switching implicit in "assignee" selection behind a logged-in
  identity.
- **Drag-and-drop is disabled while a priority filter is active**, for the correctness reason
  explained above. Reordering within a filtered view would need the server to compute position
  relative to the full column, not just the visible cards — solvable, but deliberately deferred.
- **Single-region Postgres connection pooling.** The pooled connection string is hardcoded to
  Supabase's `pooler.supabase.com` pattern; a self-hosted Postgres behind a different pooler would
  need the connection strings adjusted (see the Docker alternative above for that case).
