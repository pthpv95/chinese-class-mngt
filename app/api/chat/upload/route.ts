import { NextRequest, NextResponse } from "next/server"
import { getApiSession } from "@/lib/auth-helpers"
import { createPresignedUploadUrl } from "@/lib/storage"
import { ChatImageUploadSchema } from "@/lib/validations"

export async function POST(req: NextRequest) {
  const session = await getApiSession("TEACHER")
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const body: unknown = await req.json()
    const parsed = ChatImageUploadSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const ext = parsed.data.mimeType.split("/")[1] ?? "jpg"
    const filePath = `chat/${session.user.id}/${Date.now()}.${ext}`

    const { signedUrl } = await createPresignedUploadUrl(filePath, parsed.data.mimeType)

    return NextResponse.json({ data: { signedUrl, filePath } })
  } catch (error) {
    console.error("[POST /api/chat/upload]", error)
    return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 })
  }
}
