import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  let firstProjectId: string | null = null;
  let dbError: string | null = null;

  try {
    const project = await prisma.project.findFirst({ orderBy: { createdAt: "asc" } });
    firstProjectId = project?.id ?? null;
  } catch (err) {
    dbError = err instanceof Error ? err.message : "Unknown database error";
  }

  if (dbError) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <div className="max-w-md space-y-3 rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          <h1 className="text-base font-semibold">Can&apos;t reach the database</h1>
          <p>Make sure Postgres is running, then reload this page.</p>
          <pre className="whitespace-pre-wrap rounded bg-red-100 p-2 text-xs dark:bg-red-950/60">
            {dbError}
          </pre>
          <p className="text-red-700 dark:text-red-300">
            Run <code className="rounded bg-red-100 px-1 dark:bg-red-950/60">npm run db:up</code>{" "}
            then{" "}
            <code className="rounded bg-red-100 px-1 dark:bg-red-950/60">npm run db:push</code>{" "}
            and <code className="rounded bg-red-100 px-1 dark:bg-red-950/60">npm run db:seed</code>.
          </p>
        </div>
      </main>
    );
  }

  if (firstProjectId) {
    redirect(`/board/${firstProjectId}`);
  }

  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-md space-y-3 rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          No projects yet
        </h1>
        <p>
          Seed the database to get a demo project with users and tasks:{" "}
          <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">npm run db:seed</code>
        </p>
      </div>
    </main>
  );
}
