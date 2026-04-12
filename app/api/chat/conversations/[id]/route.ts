import { NextRequest, NextResponse } from "next/server"
import { getApiSession } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getApiSession("TEACHER")
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params

  try {
    const conversation = await prisma.conversation.findFirst({
      where: { id, teacherId: session.user.id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            role: true,
            content: true,
            imageUrls: true,
            toolCalls: true,
            toolResults: true,
            pendingActions: true,
            createdAt: true,
          },
        },
      },
    })

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    return NextResponse.json({ data: conversation })
  } catch (error) {
    console.error("[GET /api/chat/conversations/[id]]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getApiSession("TEACHER")
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params

  try {
    const conversation = await prisma.conversation.findFirst({
      where: { id, teacherId: session.user.id },
    })

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    await prisma.conversation.delete({ where: { id } })

    return NextResponse.json({ data: { deleted: true } })
  } catch (error) {
    console.error("[DELETE /api/chat/conversations/[id]]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
