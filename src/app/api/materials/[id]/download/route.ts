import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { handleApiError } from "@/lib/api-utils";
import {
  getFileStreamOrRedirectUrl,
  isInlinePreviewableMime,
} from "@/lib/storage";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
    const { id } = await context.params;
    const versionId = req.nextUrl.searchParams.get("versionId");
    const inline = req.nextUrl.searchParams.get("inline") === "1";

    const version = versionId
      ? await prisma.materialVersion.findFirst({
          where: { id: versionId, materialId: id },
        })
      : await prisma.materialVersion.findFirst({
          where: { materialId: id },
          orderBy: { versionNumber: "desc" },
        });

    if (!version || !version.fileKey || !version.fileName) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    if (!inline) {
      await prisma.material.update({
        where: { id },
        data: { downloadsCount: { increment: 1 } },
      });
    }

    const result = await getFileStreamOrRedirectUrl(
      version.fileKey,
      version.fileName,
      version.mimeType,
      inline
    );

    if (result.redirectUrl) {
      return NextResponse.redirect(result.redirectUrl);
    }

    const disposition =
      inline && isInlinePreviewableMime(version.mimeType)
        ? "inline"
        : "attachment";
    const encodedName = encodeURIComponent(version.fileName);

    return new NextResponse(new Uint8Array(result.buffer!), {
      status: 200,
      headers: {
        "Content-Type": version.mimeType || "application/octet-stream",
        "Content-Disposition": `${disposition}; filename*=UTF-8''${encodedName}`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

