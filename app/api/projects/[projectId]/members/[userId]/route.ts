import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ projectId: string; userId: string }> };

export async function DELETE(_request: Request, { params }: Context) {
  const { projectId, userId } = await params;

  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }
  if (member.role === "OWNER") {
    return NextResponse.json({ error: "Cannot remove the project owner" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.task.updateMany({
      where: { projectId, assigneeId: userId },
      data: { assigneeId: null },
    }),
    prisma.projectMember.delete({ where: { projectId_userId: { projectId, userId } } }),
  ]);

  return NextResponse.json({ ok: true });
}
