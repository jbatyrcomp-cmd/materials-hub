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

    const existing = await prisma.materialLike.findUnique({
      where: { userId_materialId: { userId: user.id, materialId: id } },
    });

    if (existing) {
      await prisma.materialLike.delete({
        where: { userId_materialId: { userId: user.id, materialId: id } },
      });
    } else {
      await prisma.materialLike.create({
        data: { userId: user.id, materialId: id },
      });
    }

    const count = await prisma.materialLike.count({ where: { materialId: id } });
    return NextResponse.json({ liked: !existing, count });
  } catch (error) {
    return handleApiError(error);
  }
}

