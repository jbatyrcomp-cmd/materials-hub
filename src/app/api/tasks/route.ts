import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth/session";
import { handleApiError, safeUserSelect } from "@/lib/api-utils";

export async function GET() {
  try {
    const user = await requireUser();
    const tasks = await prisma.deadlineTask.findMany({
      orderBy: { dueAt: "asc" },
      include: {
        subject: true,
        linkedMaterial: {
          select: { id: true, title: true, type: true },
        },
        createdBy: { select: safeUserSelect },
        completions: {
          where: { userId: user.id },
          select: { completedAt: true },
        },
      },
    });

    const formatted = tasks.map((t) => ({
      ...t,
      isCompleted: t.completions.length > 0,
      completedAt: t.completions[0]?.completedAt ?? null,
      completions: undefined,
    }));

    return NextResponse.json({ tasks: formatted });
  } catch (error) {
    return handleApiError(error);
  }
}

const createSchema = z.object({
  subjectId: z.string().min(1),
  linkedMaterialId: z.string().optional().nullable(),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000).optional(),
  kind: z.enum(["HOMEWORK", "EXAM", "EVENT"]).default("HOMEWORK"),
  dueAt: z.string().datetime(),
});

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = createSchema.parse(await req.json());
    const task = await prisma.deadlineTask.create({
      data: {
        subjectId: body.subjectId,
        linkedMaterialId: body.linkedMaterialId || null,
        title: body.title,
        description: body.description ?? null,
        kind: body.kind,
        dueAt: new Date(body.dueAt),
        createdById: admin.id,
      },
    });
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

