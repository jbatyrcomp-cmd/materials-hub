import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { handleApiError } from "@/lib/api-utils";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;

    const existing = await prisma.taskCompletion.findUnique({
      where: { userId_taskId: { userId: user.id, taskId: id } },
    });

    if (existing) {
      await prisma.taskCompletion.delete({
        where: { userId_taskId: { userId: user.id, taskId: id } },
      });
    } else {
      await prisma.taskCompletion.create({
        data: { userId: user.id, taskId: id },
      });
    }

    return NextResponse.json({ isCompleted: !existing });
  } catch (error) {
    return handleApiError(error);
  }
}

