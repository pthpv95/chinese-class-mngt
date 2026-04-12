import { NextRequest, NextResponse } from "next/server"
import { getApiSession } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { ConfirmActionSchema } from "@/lib/validations"
import { executeMutatingTool } from "@/lib/chat-tools"
import type { PendingAction } from "@/lib/types"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getApiSession("TEACHER")
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id: conversationId } = await params

  // Verify teacher owns the conversation
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, teacherId: session.user.id },
  })
  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
  }

  const body: unknown = await req.json()
  const parsed = ConfirmActionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const message = await prisma.message.findFirst({
      where: { id: parsed.data.messageId, conversationId },
    })

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 })
    }

    const pendingActions = (message.pendingActions as PendingAction[] | null) ?? []
    const action = pendingActions[parsed.data.actionIndex]

    if (!action) {
      return NextResponse.json({ error: "Action not found" }, { status: 404 })
    }

    // Idempotency: if already executed, return existing result
    if (action.executed) {
      return NextResponse.json({ data: action.result })
    }

    // Use edited input if provided, otherwise use original
    const input = parsed.data.editedInput ?? action.input

    // Execute the tool
    const result = await executeMutatingTool(action.toolName, session.user.id, input)

    // Update the pending action in the message
    pendingActions[parsed.data.actionIndex] = {
      ...action,
      input, // Store possibly edited input
      executed: true,
      result,
    }

    await prisma.message.update({
      where: { id: message.id },
      data: { pendingActions: JSON.parse(JSON.stringify(pendingActions)) },
    })

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error("[POST /api/chat/conversations/[id]/confirm]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
