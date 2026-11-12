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
  try {
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

    if (presignRes.ok) {
      const presignData = await presignRes.json();
      if (presignData.mode === "s3" && presignData.uploadUrl && presignData.fileKey) {
        try {
          const putRes = await fetch(presignData.uploadUrl, {
            method: "PUT",
            headers: {
              "Content-Type": mimeType,
            },
            body: file,
          });
          if (putRes.ok) {
            return {
              mode: "s3",
              fileKey: presignData.fileKey,
              fileName: file.name,
              mimeType,
              fileSize: file.size,
            };
          }
        } catch (putErr) {
          console.warn("Direct S3 PUT failed, checking fallback:", putErr);
        }
      }
    }
  } catch (err) {
    console.warn("Presign request failed, checking fallback:", err);
  }

  // Fallback to server route (works up to 4.5MB on Vercel)
  if (file.size > 4.5 * 1024 * 1024) {
    throw new Error(
      "Cloud storage upload failed and file exceeds 4.5 MB serverless limit"
    );
  }

  return { mode: "local" };
}

