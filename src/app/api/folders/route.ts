import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { handleApiError } from "@/lib/api-utils";

const schema = z.object({
  subjectId: z.string().min(1),
  parentId: z.string().optional().nullable(),
  name: z.string().trim().min(1).max(80),
});

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = schema.parse(await req.json());
    const folder = await prisma.folder.create({
      data: {
        subjectId: body.subjectId,
        parentId: body.parentId ?? null,
        name: body.name,
        createdById: admin.id,
      },
    });
    return NextResponse.json({ folder }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

