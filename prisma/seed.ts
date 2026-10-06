import "dotenv/config";
import { PrismaClient, Priority, TaskStatus, User } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { nextAvatarColor } from "../lib/avatar-colors";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

type TaskSeed = {
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assigneeId?: string;
  dueDate?: Date;
};

const inDays = (n: number) => new Date(Date.now() + n * 86_400_000);

async function seedProject(opts: {
  name: string;
  description: string;
  ownerId: string;
  memberIds: string[];
  tasks: TaskSeed[];
}) {
  const project = await prisma.project.create({
    data: {
      name: opts.name,
      description: opts.description,
      ownerId: opts.ownerId,
      members: {
        create: opts.memberIds.map((userId) => ({
          userId,
          role: userId === opts.ownerId ? "OWNER" : "MEMBER",
        })),
      },
    },
  });

  const positionByStatus: Record<TaskStatus, number> = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
  for (const t of opts.tasks) {
    await prisma.task.create({
      data: {
        projectId: project.id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        assigneeId: t.assigneeId,
        dueDate: t.dueDate,
        position: positionByStatus[t.status]++,
      },
    });
  }

  console.log(`Seeded project "${project.name}" with ${opts.tasks.length} tasks and ${opts.memberIds.length} members.`);
}

async function main() {
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  const userDefs = [
    { name: "Avery Chen", email: "avery@example.com" },
    { name: "Priya Nair", email: "priya@example.com" },
    { name: "Jordan Blake", email: "jordan@example.com" },
    { name: "Sam Okafor", email: "sam@example.com" },
  ];

  const users: User[] = [];
  for (let i = 0; i < userDefs.length; i++) {
    const user = await prisma.user.create({
      data: { ...userDefs[i], avatarColor: nextAvatarColor(i) },
    });
    users.push(user);
  }
  const [avery, priya, jordan, sam] = users;

  // Project 1: everyone is a member, and Avery is deliberately overloaded
  // (6 tasks in IN_PROGRESS) so the workload pulse is visible immediately.
  await seedProject({
    name: "Website Relaunch",
    description: "Rebuild the marketing site and docs portal.",
    ownerId: avery.id,
    memberIds: users.map((u) => u.id),
    tasks: [
      { title: "Define sitemap", description: "List all pages and routes for the new site.", status: "TODO", priority: "MEDIUM", assigneeId: priya.id, dueDate: inDays(5) },
      { title: "Pick component library", description: "Evaluate options for the design system.", status: "TODO", priority: "LOW", assigneeId: jordan.id },
      { title: "Draft pricing page copy", description: "Coordinate with marketing on messaging.", status: "TODO", priority: "HIGH", assigneeId: sam.id, dueDate: inDays(3) },
      { title: "Set up CI pipeline", description: "GitHub Actions for lint/test/build.", status: "IN_PROGRESS", priority: "HIGH", assigneeId: avery.id, dueDate: inDays(1) },
      { title: "Build Kanban board UI", description: "Columns, cards, drag and drop.", status: "IN_PROGRESS", priority: "URGENT", assigneeId: avery.id, dueDate: inDays(2) },
      { title: "Wire up task API", description: "CRUD endpoints for tasks.", status: "IN_PROGRESS", priority: "HIGH", assigneeId: avery.id, dueDate: inDays(2) },
      { title: "Design review pass", description: "Review spacing and typography.", status: "IN_PROGRESS", priority: "MEDIUM", assigneeId: avery.id },
      { title: "Fix auth redirect bug", description: "Users land on 404 after login.", status: "IN_PROGRESS", priority: "URGENT", assigneeId: avery.id, dueDate: inDays(1) },
      { title: "Migrate images to CDN", description: "Move static assets off the server.", status: "IN_PROGRESS", priority: "LOW", assigneeId: avery.id },
      { title: "Write onboarding emails", description: "Draft the first three lifecycle emails.", status: "IN_PROGRESS", priority: "MEDIUM", assigneeId: priya.id },
      { title: "Kickoff meeting notes", description: "Summary and action items.", status: "DONE", priority: "LOW", assigneeId: jordan.id },
      { title: "Competitive audit", description: "Reviewed five competitor sites.", status: "DONE", priority: "MEDIUM", assigneeId: sam.id },
    ],
  });

  // Project 2: a smaller team (Sam isn't a member here, showing membership
  // is per-project) with a healthy, non-overloaded workload for contrast.
  await seedProject({
    name: "Mobile App Launch",
    description: "Ship v1 of the companion mobile app to the App Store and Play Store.",
    ownerId: priya.id,
    memberIds: [priya.id, jordan.id, avery.id],
    tasks: [
      { title: "Finalize onboarding flow", description: "Three-screen intro, skip option on screen two.", status: "TODO", priority: "MEDIUM", assigneeId: jordan.id, dueDate: inDays(7) },
      { title: "App Store listing copy", description: "Title, subtitle, keywords, screenshots.", status: "TODO", priority: "LOW", assigneeId: priya.id },
      { title: "Push notification opt-in prompt", description: "Ask after first completed task, not on launch.", status: "TODO", priority: "HIGH", assigneeId: avery.id, dueDate: inDays(4) },
      { title: "Offline sync for task list", description: "Queue mutations and replay on reconnect.", status: "IN_PROGRESS", priority: "URGENT", assigneeId: avery.id, dueDate: inDays(2) },
      { title: "Biometric login", description: "Face ID / fingerprint unlock before showing the board.", status: "IN_PROGRESS", priority: "MEDIUM", assigneeId: jordan.id, dueDate: inDays(6) },
      { title: "Crash reporting setup", description: "Wire up Sentry for the mobile client.", status: "IN_PROGRESS", priority: "HIGH", assigneeId: priya.id },
      { title: "App icon and splash screen", description: "Final assets delivered by design.", status: "DONE", priority: "LOW", assigneeId: jordan.id },
      { title: "Beta TestFlight rollout", description: "Invited 25 internal testers.", status: "DONE", priority: "MEDIUM", assigneeId: avery.id },
    ],
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
