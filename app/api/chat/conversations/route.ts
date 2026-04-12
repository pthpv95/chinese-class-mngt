import { NextRequest, NextResponse } from "next/server"
import { getApiSession } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { CreateConversationSchema } from "@/lib/validations"

export async function GET() {
  const session = await getApiSession("TEACHER")
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const conversations = await prisma.conversation.findMany({
      where: { teacherId: session.user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    })

    const data = conversations.map((c) => ({
      id: c.id,
      title: c.title,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      messageCount: c._count.messages,
    }))

    return NextResponse.json({ data })
  } catch (error) {
    console.error("[GET /api/chat/conversations]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getApiSession("TEACHER")
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const body: unknown = await req.json()
    const parsed = CreateConversationSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const conversation = await prisma.conversation.create({
      data: {
        title: parsed.data.title ?? null,
        teacherId: session.user.id,
      },
    })

    return NextResponse.json({ data: conversation }, { status: 201 })
  } catch (error) {
    console.error("[POST /api/chat/conversations]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
