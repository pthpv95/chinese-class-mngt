export interface UploadAudioResult {
  publicUrl: string
  filePath: string
}

export async function uploadAudio(
  blob: Blob,
  exerciseId: string,
  studentId: string
): Promise<UploadAudioResult> {
  // Step 1: Get presigned PUT URL from our API
  const mimeType = blob.type || "audio/webm"
  const res = await fetch("/api/upload/audio", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      exerciseId,
      studentId,
      mimeType,
      fileSizeBytes: blob.size,
    }),
  })

  if (!res.ok) {
    const json = (await res.json()) as { error?: string }
    throw new Error(json.error ?? "Failed to get upload URL")
  }

  const { data } = (await res.json()) as {
    data: { signedUrl: string; filePath: string }
  }

  // Step 2: PUT directly to S3/MinIO (bypasses Next.js server)
  const uploadRes = await fetch(data.signedUrl, {
    method: "PUT",
    headers: { "Content-Type": mimeType },
    body: blob,
  })

  if (!uploadRes.ok) throw new Error("Audio upload to storage failed")

  return { filePath: data.filePath, publicUrl: data.filePath }
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

export async function getAudioPlaybackUrl(filePath: string): Promise<string | null> {
  const { createPresignedDownloadUrl } = await import("@/lib/storage")
  return createPresignedDownloadUrl(filePath).catch(() => null)
}
