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

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;

    const existing = await prisma.material.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.material.update({
      where: { id },
      data: { viewsCount: { increment: 1 } },
    });

    const material = await prisma.material.findUnique({
      where: { id },
      include: {
        subject: true,
        folder: true,
        author: { select: safeUserSelect },
        tags: { include: { tag: true } },
        versions: {
          orderBy: { versionNumber: "desc" },
          include: { editor: { select: safeUserSelect } },
        },
        comments: {
          orderBy: { createdAt: "asc" },
          include: { author: { select: safeUserSelect } },
        },
        _count: {
          select: { likes: true, comments: true, bookmarks: true },
        },
        likes: { where: { userId: user.id }, select: { userId: true } },
        bookmarks: { where: { userId: user.id }, select: { userId: true } },
      },
    });

    if (!material) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      material: {
        ...material,
        tags: material.tags.map((t) => t.tag.name),
        isLiked: material.likes.length > 0,
        isBookmarked: material.bookmarks.length > 0,
        embedInfo: material.externalUrl
          ? detectEmbedInfo(material.externalUrl)
          : null,
        likes: undefined,
        bookmarks: undefined,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

const patchSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  description: z.string().trim().max(1000).optional().nullable(),
  subjectId: z.string().min(1).optional(),
  folderId: z.string().optional().nullable(),
  externalUrl: z.string().url().optional().nullable(),
  noteContent: z.string().optional(),
  fileKey: z.string().startsWith("materials/").optional(),
  fileName: z.string().trim().min(1).max(200).optional(),
  mimeType: z.string().trim().max(150).optional(),
  fileSize: z.number().int().min(1).optional(),
  changeSummary: z.string().trim().max(200).optional(),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;

    const existing = await prisma.material.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (user.role !== "ADMIN" && existing.authorId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      if (existing.type !== "FILE") {
        return NextResponse.json(
          { error: "File version upload only valid for FILE materials" },
          { status: 400 }
        );
      }

      const formData = await req.formData();
      const file = formData.get("file");
      const changeSummary =
        String(formData.get("changeSummary") ?? "").trim() ||
        "Yangi fayl versiyasi yuklandi";

      if (!(file instanceof File) || file.size === 0) {
        return NextResponse.json({ error: "File is required" }, { status: 400 });
      }
      const maxBytes = getMaxUploadBytes();
      if (file.size > maxBytes) {
        return NextResponse.json({ error: "File too large" }, { status: 400 });
      }

      const nextVersion = existing.currentVersion + 1;
      const buffer = Buffer.from(await file.arrayBuffer());
      const storageKey = buildStorageKey(existing.id, nextVersion, file.name);
      await saveUploadedFile(storageKey, buffer, file.type || "application/octet-stream");

      const updated = await prisma.$transaction(async (tx) => {
        await tx.materialVersion.create({
          data: {
            materialId: existing.id,
            versionNumber: nextVersion,
            fileKey: storageKey,
            fileName: file.name,
            mimeType: file.type || "application/octet-stream",
            fileSize: file.size,
            changeSummary,
            editorId: user.id,
          },
        });
        return tx.material.update({
          where: { id: existing.id },
          data: { currentVersion: nextVersion },
        });
      });

      return NextResponse.json({ material: updated });
    }

    const body = patchSchema.parse(await req.json());
    const embedInfo = body.externalUrl
      ? detectEmbedInfo(body.externalUrl)
      : undefined;

    const updated = await prisma.$transaction(async (tx) => {
      let nextVersion = existing.currentVersion;
      if (existing.type === "NOTE" && typeof body.noteContent === "string") {
        nextVersion += 1;
        await tx.materialVersion.create({
          data: {
            materialId: existing.id,
            versionNumber: nextVersion,
            noteContent: body.noteContent,
            changeSummary: body.changeSummary || "Konspekt yangilandi",
            editorId: user.id,
          },
        });
      } else if (
        existing.type === "FILE" &&
        body.fileKey &&
        body.fileName &&
        body.fileSize
      ) {
        nextVersion += 1;
        await tx.materialVersion.create({
          data: {
            materialId: existing.id,
            versionNumber: nextVersion,
            fileKey: body.fileKey,
            fileName: body.fileName,
            mimeType: body.mimeType || "application/octet-stream",
            fileSize: body.fileSize,
            changeSummary:
              body.changeSummary || "Yangi fayl versiyasi yuklandi",
            editorId: user.id,
          },
        });
      }

      return tx.material.update({
        where: { id: existing.id },
        data: {
          title: body.title ?? existing.title,
          description:
            body.description !== undefined
              ? body.description
              : existing.description,
          subjectId: body.subjectId ?? existing.subjectId,
          folderId:
            body.folderId !== undefined ? body.folderId : existing.folderId,
          externalUrl:
            body.externalUrl !== undefined
              ? body.externalUrl
              : existing.externalUrl,
          embedProvider: embedInfo ? embedInfo.provider : existing.embedProvider,
          currentVersion: nextVersion,
        },
      });
    });

    return NextResponse.json({ material: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const existing = await prisma.material.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (user.role !== "ADMIN" && existing.authorId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.material.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

