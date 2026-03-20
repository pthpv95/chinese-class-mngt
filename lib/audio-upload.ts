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

export async function transcodeToWav(blob: Blob): Promise<Blob> {
  const ctx = new AudioContext()
  const arrayBuffer = await blob.arrayBuffer()
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
  await ctx.close()

  const numChannels = audioBuffer.numberOfChannels
  const sampleRate = audioBuffer.sampleRate
  const numSamples = audioBuffer.length
  const bytesPerSample = 2 // 16-bit PCM
  const dataSize = numSamples * numChannels * bytesPerSample
  const bufferSize = 44 + dataSize
  const wavBuffer = new ArrayBuffer(bufferSize)
  const view = new DataView(wavBuffer)

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }

  writeString(0, "RIFF")
  view.setUint32(4, 36 + dataSize, true)
  writeString(8, "WAVE")
  writeString(12, "fmt ")
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true)
  view.setUint16(32, numChannels * bytesPerSample, true)
  view.setUint16(34, 16, true)
  writeString(36, "data")
  view.setUint32(40, dataSize, true)

  // Interleave channels and write 16-bit PCM samples
  let offset = 44
  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(ch)[i] ?? 0))
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
      offset += 2
    }
  }

  return new Blob([wavBuffer], { type: "audio/wav" })
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
