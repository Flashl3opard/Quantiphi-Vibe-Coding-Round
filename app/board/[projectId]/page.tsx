import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BoardClient } from "@/components/BoardClient";

type Props = { params: Promise<{ projectId: string }> };

export default async function BoardPage({ params }: Props) {
  const { projectId } = await params;

  const [project, tasks, users, allProjects] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      include: { owner: true, members: { include: { user: true } } },
    }),
    prisma.task.findMany({
      where: { projectId },
      include: { assignee: true },
      orderBy: [{ status: "asc" }, { position: "asc" }],
    }),
    prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.project.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        owner: true,
        members: { include: { user: true } },
        _count: { select: { tasks: true } },
      },
    }),
  ]);

  if (!project) notFound();

  return (
    <BoardClient
      project={project}
      initialTasks={tasks}
      initialUsers={users}
      initialProjects={allProjects}
    />
  );
}
