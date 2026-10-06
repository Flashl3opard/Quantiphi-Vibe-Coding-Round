import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createProjectSchema } from "@/lib/validators";

export async function GET() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      owner: true,
      members: { include: { user: true } },
      _count: { select: { tasks: true } },
    },
  });
  return NextResponse.json(projects);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const owner = await prisma.user.findUnique({ where: { id: parsed.data.ownerId } });
  if (!owner) {
    return NextResponse.json({ error: "Owner not found" }, { status: 404 });
  }

  const project = await prisma.project.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      ownerId: parsed.data.ownerId,
      members: {
        create: { userId: parsed.data.ownerId, role: "OWNER" },
      },
    },
    include: { owner: true, members: { include: { user: true } } },
  });

  return NextResponse.json(project, { status: 201 });
}
