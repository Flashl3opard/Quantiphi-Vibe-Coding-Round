import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addMemberSchema } from "@/lib/validators";

type Context = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { projectId } = await params;
  const members = await prisma.projectMember.findMany({
    where: { projectId },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(members);
}

export async function POST(request: NextRequest, { params }: Context) {
  const { projectId } = await params;
  const body = await request.json();
  const parsed = addMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const user = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const existing = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: parsed.data.userId } },
  });
  if (existing) {
    return NextResponse.json({ error: "User is already a member" }, { status: 409 });
  }

  const member = await prisma.projectMember.create({
    data: {
      projectId,
      userId: parsed.data.userId,
      role: parsed.data.role ?? "MEMBER",
    },
    include: { user: true },
  });

  return NextResponse.json(member, { status: 201 });
}
