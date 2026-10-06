import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateTaskSchema } from "@/lib/validators";

type Context = { params: Promise<{ taskId: string }> };

export async function PATCH(request: NextRequest, { params }: Context) {
  const { taskId } = await params;
  const body = await request.json();
  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const { status, position, assigneeId, ...fields } = parsed.data;

  if (assigneeId) {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: task.projectId, userId: assigneeId } },
    });
    if (!member) {
      return NextResponse.json(
        { error: "Assignee must be a member of this project" },
        { status: 400 }
      );
    }
  }

  const isMove = status !== undefined || position !== undefined;

  if (!isMove) {
    const updated = await prisma.task.update({
      where: { id: taskId },
      data: { ...fields, assigneeId: assigneeId === undefined ? undefined : assigneeId },
      include: { assignee: true },
    });
    return NextResponse.json(updated);
  }

  const destStatus = status ?? task.status;
  const siblings = await prisma.task.findMany({
    where: { projectId: task.projectId, status: destStatus, id: { not: taskId } },
    orderBy: { position: "asc" },
  });

  const targetIndex = position === undefined ? siblings.length : Math.max(0, Math.min(position, siblings.length));
  const reordered = [
    ...siblings.slice(0, targetIndex),
    { ...task, id: taskId },
    ...siblings.slice(targetIndex),
  ];

  const updates = reordered
    .map((t, index) => {
      if (t.id === taskId) {
        return prisma.task.update({
          where: { id: taskId },
          data: {
            ...fields,
            assigneeId: assigneeId === undefined ? undefined : assigneeId,
            status: destStatus,
            position: index,
          },
          include: { assignee: true },
        });
      }
      if (t.position === index) return null;
      return prisma.task.update({ where: { id: t.id }, data: { position: index } });
    })
    .filter((op): op is NonNullable<typeof op> => op !== null);

  const results = await prisma.$transaction(updates);
  const updatedTask = results.find((r) => r.id === taskId);

  return NextResponse.json(updatedTask);
}

export async function DELETE(_request: Request, { params }: Context) {
  const { taskId } = await params;
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  await prisma.task.delete({ where: { id: taskId } });
  return NextResponse.json({ ok: true });
}
