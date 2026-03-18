import { NextRequest, NextResponse } from "next/server"
import { createPresignedUploadUrl } from "@/lib/storage"
import { getApiSession } from "@/lib/auth-helpers"
import { AudioUploadSchema } from "@/lib/validations"

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20 MB

export async function POST(req: NextRequest) {
  const session = await getApiSession("STUDENT")
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body: unknown = await req.json()
  const parsed = AudioUploadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  if (parsed.data.studentId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (parsed.data.fileSizeBytes > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large. Max 20 MB." }, { status: 400 })
  }

  try {
    const ext = parsed.data.mimeType.split("/")[1] ?? "webm"
    const filePath = `audio/${parsed.data.exerciseId}/${session.user.id}/${Date.now()}.${ext}`

    const { signedUrl } = await createPresignedUploadUrl(filePath, parsed.data.mimeType)

    return NextResponse.json({ data: { signedUrl, filePath } })
  } catch (error) {
    console.error("[POST /api/upload/audio]", error)
    return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 })
  }
}
