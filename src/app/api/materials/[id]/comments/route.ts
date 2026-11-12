import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { handleApiError, safeUserSelect } from "@/lib/api-utils";

const createSchema = z.object({
  body: z.string().trim().min(1).max(2000),
  parentId: z.string().optional().nullable(),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const data = createSchema.parse(await req.json());

    const comment = await prisma.comment.create({
      data: {
        materialId: id,
        authorId: user.id,
        parentId: data.parentId ?? null,
        body: data.body,
      },
      include: {
        author: { select: safeUserSelect },
      },
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const commentId = req.nextUrl.searchParams.get("commentId");
    if (!commentId) {
      return NextResponse.json({ error: "Missing commentId" }, { status: 400 });
    }

    const existing = await prisma.comment.findFirst({
      where: { id: commentId, materialId: id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (user.role !== "ADMIN" && existing.authorId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.comment.delete({ where: { id: commentId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

