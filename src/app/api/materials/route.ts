import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { handleApiError, safeUserSelect } from "@/lib/api-utils";
import { detectEmbedInfo } from "@/lib/utils";
import {
  buildStorageKey,
  getMaxUploadBytes,
  saveUploadedFile,
} from "@/lib/storage";

const MATERIAL_TYPES = ["FILE", "NOTE", "LINK", "VIDEO_LINK", "AUDIO_LINK"] as const;

function parseTagsInput(raw: string | string[] | null | undefined): string[] {
  if (!raw) return [];
  const items = Array.isArray(raw) ? raw : raw.split(",");
  return Array.from(
    new Set(
      items
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0 && t.length <= 32)
    )
  ).slice(0, 10);
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const params = req.nextUrl.searchParams;
    const q = params.get("q")?.trim() ?? "";
    const subjectId = params.get("subjectId")?.trim() ?? "";
    const folderId = params.get("folderId")?.trim() ?? "";
    const type = params.get("type")?.trim() ?? "";
    const tag = params.get("tag")?.trim().toLowerCase() ?? "";
    const bookmarkedOnly = params.get("bookmarked") === "1";
    const sort = params.get("sort") ?? "newest";

    const where: Record<string, unknown> = {};
    if (subjectId) where.subjectId = subjectId;
    if (folderId) where.folderId = folderId;
    if (type && MATERIAL_TYPES.includes(type as (typeof MATERIAL_TYPES)[number])) {
      where.type = type;
    }
    if (tag) {
      where.tags = { some: { tag: { name: tag } } };
    }
    if (bookmarkedOnly) {
      where.bookmarks = { some: { userId: user.id } };
    }
    if (q) {
      where.OR = [
        { title: { contains: q } },
        { description: { contains: q } },
        { tags: { some: { tag: { name: { contains: q.toLowerCase() } } } } },
        { versions: { some: { noteContent: { contains: q } } } },
      ];
    }

    const orderBy =
      sort === "popular"
        ? [{ viewsCount: "desc" as const }, { createdAt: "desc" as const }]
        : sort === "liked"
          ? [{ likes: { _count: "desc" as const } }, { createdAt: "desc" as const }]
          : [{ createdAt: "desc" as const }];

    const materials = await prisma.material.findMany({
      where,
      orderBy,
      take: 100,
      include: {
        subject: true,
        folder: true,
        author: { select: safeUserSelect },
        tags: { include: { tag: true } },
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
          select: {
            id: true,
            versionNumber: true,
            fileName: true,
            mimeType: true,
            fileSize: true,
          },
        },
        _count: {
          select: { likes: true, comments: true, bookmarks: true },
        },
        likes: {
          where: { userId: user.id },
          select: { userId: true },
        },
        bookmarks: {
          where: { userId: user.id },
          select: { userId: true },
        },
      },
    });

    const formatted = materials.map((m) => ({
      ...m,
      tags: m.tags.map((t) => t.tag.name),
      latestVersion: m.versions[0] ?? null,
      isLiked: m.likes.length > 0,
      isBookmarked: m.bookmarks.length > 0,
      likes: undefined,
      bookmarks: undefined,
      versions: undefined,
    }));

    return NextResponse.json({ materials: formatted });
  } catch (error) {
    return handleApiError(error);
  }
}

const jsonCreateSchema = z.object({
  type: z.enum(["FILE", "NOTE", "LINK", "VIDEO_LINK", "AUDIO_LINK"]),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000).optional(),
  subjectId: z.string().min(1),
  folderId: z.string().optional().nullable(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  externalUrl: z.string().url().optional(),
  noteContent: z.string().optional(),
  fileKey: z.string().startsWith("materials/").optional(),
  fileName: z.string().trim().min(1).max(200).optional(),
  mimeType: z.string().trim().max(150).optional(),
  fileSize: z.number().int().min(1).optional(),
  changeSummary: z.string().trim().max(200).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");
      const title = String(formData.get("title") ?? "").trim();
      const description = String(formData.get("description") ?? "").trim() || null;
      const subjectId = String(formData.get("subjectId") ?? "").trim();
      const folderIdRaw = String(formData.get("folderId") ?? "").trim();
      const folderId = folderIdRaw || null;
      const tagsList = parseTagsInput(String(formData.get("tags") ?? ""));
      const changeSummary =
        String(formData.get("changeSummary") ?? "").trim() || "Dastlabki fayl yuklandi";

      if (!title || !subjectId) {
        return NextResponse.json(
          { error: "Title and subjectId are required" },
          { status: 400 }
        );
      }

      if (!(file instanceof File) || file.size === 0) {
        return NextResponse.json({ error: "File is required" }, { status: 400 });
      }

      const maxBytes = getMaxUploadBytes();
      if (file.size > maxBytes) {
        return NextResponse.json(
          { error: `File size exceeds limit (${Math.round(maxBytes / 1024 / 1024)} MB)` },
          { status: 400 }
        );
      }

      const material = await prisma.material.create({
        data: {
          type: "FILE",
          title,
          description,
          subjectId,
          folderId,
          authorId: user.id,
          currentVersion: 1,
        },
      });

      let storageKey = "";
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        storageKey = buildStorageKey(material.id, 1, file.name);
        await saveUploadedFile(storageKey, buffer, file.type || "application/octet-stream");
      } catch (uploadErr) {
        await prisma.material.delete({ where: { id: material.id } }).catch(() => {});
        throw uploadErr;
      }

      await prisma.$transaction(async (tx) => {
        await tx.materialVersion.create({
          data: {
            materialId: material.id,
            versionNumber: 1,
            fileKey: storageKey,
            fileName: file.name,
            mimeType: file.type || "application/octet-stream",
            fileSize: file.size,
            changeSummary,
            editorId: user.id,
          },
        });

        for (const tagName of tagsList) {
          const tag = await tx.tag.upsert({
            where: { name: tagName },
            update: {},
            create: { name: tagName },
          });
          await tx.materialTag.create({
            data: { materialId: material.id, tagId: tag.id },
          });
        }
      });

      return NextResponse.json({ material }, { status: 201 });
    }

    const body = jsonCreateSchema.parse(await req.json());
    if (body.type === "FILE" && (!body.fileKey || !body.fileName || !body.fileSize)) {
      return NextResponse.json(
        { error: "fileKey, fileName and fileSize are required for presigned FILE upload" },
        { status: 400 }
      );
    }
    if (body.type !== "NOTE" && body.type !== "FILE" && !body.externalUrl) {
      return NextResponse.json(
        { error: "externalUrl is required for link materials" },
        { status: 400 }
      );
    }
    if (body.type === "NOTE" && !body.noteContent?.trim()) {
      return NextResponse.json(
        { error: "noteContent is required for note materials" },
        { status: 400 }
      );
    }

    const embedInfo = body.externalUrl
      ? detectEmbedInfo(body.externalUrl)
      : { provider: null };
    const tagsList = parseTagsInput(body.tags);

    const material = await prisma.$transaction(async (tx) => {
      const created = await tx.material.create({
        data: {
          type: body.type,
          title: body.title,
          description: body.description ?? null,
          subjectId: body.subjectId,
          folderId: body.folderId || null,
          authorId: user.id,
          externalUrl: body.externalUrl ?? null,
          embedProvider: embedInfo.provider,
          currentVersion: 1,
          versions: {
            create: {
              versionNumber: 1,
              noteContent: body.type === "NOTE" ? body.noteContent ?? "" : null,
              fileKey: body.type === "FILE" ? body.fileKey : null,
              fileName: body.type === "FILE" ? body.fileName : null,
              mimeType:
                body.type === "FILE"
                  ? body.mimeType || "application/octet-stream"
                  : null,
              fileSize: body.type === "FILE" ? body.fileSize : null,
              changeSummary:
                body.changeSummary ||
                (body.type === "FILE"
                  ? "Dastlabki fayl yuklandi"
                  : "Dastlabki versiya"),
              editorId: user.id,
            },
          },
        },
      });

      for (const tagName of tagsList) {
        const tag = await tx.tag.upsert({
          where: { name: tagName },
          update: {},
          create: { name: tagName },
        });
        await tx.materialTag.create({
          data: { materialId: created.id, tagId: tag.id },
        });
      }

      return created;
    });

    return NextResponse.json({ material }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

