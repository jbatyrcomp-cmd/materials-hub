export type SmartUploadResult =
  | {
      mode: "s3";
      fileKey: string;
      fileName: string;
      mimeType: string;
      fileSize: number;
    }
  | {
      mode: "local";
    };

/**
 * Requests an upload target from /api/uploads/presign.
 * In S3/R2 mode, uploads directly from browser to object storage (bypassing Vercel 4.5MB API limit).
 * In local mode, returns { mode: "local" } so caller posts FormData to the API route.
 */
export async function uploadFileSmart(
  file: File,
  materialId?: string,
  versionNumber?: number
): Promise<SmartUploadResult> {
  const mimeType = file.type || "application/octet-stream";
  const presignRes = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      mimeType,
      fileSize: file.size,
      materialId,
      versionNumber,
    }),
  });

  const presignData = await presignRes.json();
  if (!presignRes.ok) {
    throw new Error(presignData.error || "Failed to initialize file upload");
  }

  if (presignData.mode === "s3" && presignData.uploadUrl && presignData.fileKey) {
    const putRes = await fetch(presignData.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": mimeType,
      },
      body: file,
    });
    if (!putRes.ok) {
      throw new Error("Direct cloud storage upload failed");
    }
    return {
      mode: "s3",
      fileKey: presignData.fileKey,
      fileName: file.name,
      mimeType,
      fileSize: file.size,
    };
  }

  return { mode: "local" };
}

