import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createTaskSchema, priorityValues } from "@/lib/validators";

type Context = { params: Promise<{ projectId: string }> };

export async function GET(request: NextRequest, { params }: Context) {
  const { projectId } = await params;
  const priority = request.nextUrl.searchParams.get("priority");

  if (priority && !priorityValues.includes(priority as (typeof priorityValues)[number])) {
    return NextResponse.json({ error: "Invalid priority filter" }, { status: 400 });
  }

  const tasks = await prisma.task.findMany({
    where: {
      projectId,
      ...(priority ? { priority: priority as (typeof priorityValues)[number] } : {}),
    },
    include: { assignee: true },
    orderBy: [{ status: "asc" }, { position: "asc" }],
  });

  return NextResponse.json(tasks);
}

export async function POST(request: NextRequest, { params }: Context) {
  const { projectId } = await params;
  const body = await request.json();
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (parsed.data.assigneeId) {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: parsed.data.assigneeId } },
    });
    if (!member) {
      return NextResponse.json(
        { error: "Assignee must be a member of this project" },
        { status: 400 }
      );
    }
  }

  const status = parsed.data.status ?? "TODO";
  const maxPosition = await prisma.task.aggregate({
    where: { projectId, status },
    _max: { position: true },
  });

  const task = await prisma.task.create({
    data: {
      projectId,
      title: parsed.data.title,
      description: parsed.data.description ?? undefined,
      priority: parsed.data.priority ?? "MEDIUM",
      status,
      dueDate: parsed.data.dueDate ?? undefined,
      assigneeId: parsed.data.assigneeId ?? undefined,
      position: (maxPosition._max.position ?? -1) + 1,
    },
    include: { assignee: true },
  });

  return NextResponse.json(task, { status: 201 });
}
