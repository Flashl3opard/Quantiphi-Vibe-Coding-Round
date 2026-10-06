import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createUserSchema } from "@/lib/validators";
import { nextAvatarColor } from "@/lib/avatar-colors";

/**
 * Lightweight "who are you" lookup — no password, no session. Finds a user
 * by email, creating one if it doesn't exist yet. The client is responsible
 * for remembering the returned id (see lib/current-user.ts).
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return NextResponse.json(existing);
  }

  const existingCount = await prisma.user.count();
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      avatarColor: nextAvatarColor(existingCount),
    },
  });

  return NextResponse.json(user, { status: 201 });
}
