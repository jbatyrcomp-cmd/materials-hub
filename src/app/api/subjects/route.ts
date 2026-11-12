import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth/session";
import { handleApiError } from "@/lib/api-utils";
import { slugify } from "@/lib/utils";

export async function GET() {
  try {
    await requireUser();
    const subjects = await prisma.subject.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        folders: {
          orderBy: { name: "asc" },
        },
        _count: {
          select: {
            materials: true,
            officialTests: true,
            flashcardDecks: true,
          },
        },
      },
    });
    return NextResponse.json({ subjects });
  } catch (error) {
    return handleApiError(error);
  }
}

const createSchema = z.object({
  nameUz: z.string().trim().min(1).max(80),
  nameTk: z.string().trim().min(1).max(80),
  descriptionUz: z.string().trim().max(300).optional(),
  descriptionTk: z.string().trim().max(300).optional(),
  color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).default("#3b82f6"),
  icon: z.string().trim().max(40).default("BookOpen"),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const data = createSchema.parse(await req.json());
    const baseSlug = slugify(data.nameUz);
    const existingCount = await prisma.subject.count({
      where: { slug: { startsWith: baseSlug } },
    });
    const slug = existingCount > 0 ? `${baseSlug}-${existingCount + 1}` : baseSlug;

    const subject = await prisma.subject.create({
      data: {
        slug,
        nameUz: data.nameUz,
        nameTk: data.nameTk,
        descriptionUz: data.descriptionUz ?? null,
        descriptionTk: data.descriptionTk ?? null,
        color: data.color,
        icon: data.icon,
      },
    });
    return NextResponse.json({ subject }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

