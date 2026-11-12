import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { handleApiError } from "@/lib/api-utils";

const schema = z.object({
  versionId: z.string().min(1),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const { versionId } = schema.parse(await req.json());

    const material = await prisma.material.findUnique({ where: { id } });
    if (!material) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (user.role !== "ADMIN" && material.authorId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const targetVersion = await prisma.materialVersion.findUnique({
      where: { id: versionId },
    });
    if (!targetVersion || targetVersion.materialId !== material.id) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    const nextVersionNumber = material.currentVersion + 1;
    const created = await prisma.$transaction(async (tx) => {
      const ver = await tx.materialVersion.create({
        data: {
          materialId: material.id,
          versionNumber: nextVersionNumber,
          noteContent: targetVersion.noteContent,
          fileKey: targetVersion.fileKey,
          fileName: targetVersion.fileName,
          mimeType: targetVersion.mimeType,
          fileSize: targetVersion.fileSize,
          changeSummary: `v${targetVersion.versionNumber} versiyadan tiklandi`,
          editorId: user.id,
        },
      });
      await tx.material.update({
        where: { id: material.id },
        data: { currentVersion: nextVersionNumber },
      });
      return ver;
    });

    return NextResponse.json({ version: created });
  } catch (error) {
    return handleApiError(error);
  }
}

