import { NextRequest, NextResponse } from "next/server"
import { getApiSession } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { SendMessageSchema } from "@/lib/validations"
import { buildClaudeMessages, streamChatResponse } from "@/lib/claude"
import { fetchObjectAsBuffer } from "@/lib/storage"
import type Anthropic from "@anthropic-ai/sdk"

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
  const parsed = SendMessageSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    // Save the user message
    await prisma.message.create({
      data: {
        conversationId,
        role: "user",
        content: parsed.data.content,
        imageUrls: parsed.data.imageUrls,
      },
    })

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    })

    // Load conversation history
    const dbMessages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      select: {
        role: true,
        content: true,
        imageUrls: true,
        toolCalls: true,
        toolResults: true,
      },
    })

    // Convert uploaded images to base64 for Claude vision
    const imageBase64Blocks: Anthropic.ImageBlockParam[] = []
    for (const url of parsed.data.imageUrls) {
      try {
        const buffer = await fetchObjectAsBuffer(url)
        const ext = url.split(".").pop() ?? "jpeg"
        const mediaType = ext === "png" ? "image/png"
          : ext === "webp" ? "image/webp"
          : ext === "gif" ? "image/gif"
          : "image/jpeg"
        imageBase64Blocks.push({
          type: "image",
          source: {
            type: "base64",
            media_type: mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
            data: buffer.toString("base64"),
          },
        })
      } catch (err) {
        console.error(`Failed to fetch image ${url}:`, err)
      }
    }

    // Fetch images for historical user messages so Claude retains vision context across turns
    const historicalMessages = dbMessages.slice(0, -1)
    const historicalImageBlocks: Anthropic.ImageBlockParam[][] = await Promise.all(
      historicalMessages.map(async (msg) => {
        if (msg.role !== "user" || msg.imageUrls.length === 0) return []
        const blocks: Anthropic.ImageBlockParam[] = []
        for (const url of msg.imageUrls) {
          try {
            const buffer = await fetchObjectAsBuffer(url)
            const ext = url.split(".").pop() ?? "jpeg"
            const mediaType = ext === "png" ? "image/png"
              : ext === "webp" ? "image/webp"
              : ext === "gif" ? "image/gif"
              : "image/jpeg"
            blocks.push({
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
                data: buffer.toString("base64"),
              },
            })
          } catch (err) {
            console.error(`Failed to fetch historical image ${url}:`, err)
          }
        }
        return blocks
      })
    )

    // Build messages for Claude
    const claudeMessages = buildClaudeMessages(
      historicalMessages,
      parsed.data.content,
      imageBase64Blocks,
      historicalImageBlocks
    )

    // Create a streaming response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const result = await streamChatResponse(
            claudeMessages,
            session.user.id,
            (event) => {
              const sseData = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`
              controller.enqueue(encoder.encode(sseData))
            }
          )

          // Save assistant message to DB
          await prisma.message.create({
            data: {
              conversationId,
              role: "assistant",
              content: result.content,
              toolCalls: result.toolCalls.length > 0 ? JSON.parse(JSON.stringify(result.toolCalls)) : undefined,
              pendingActions: result.pendingActions.length > 0 ? JSON.parse(JSON.stringify(result.pendingActions)) : undefined,
            },
          })

          // Auto-generate title on first message if none set
          if (!conversation.title && result.content.length > 0) {
            const title = parsed.data.content.slice(0, 100)
            await prisma.conversation.update({
              where: { id: conversationId },
              data: { title },
            })
          }

          controller.close()
        } catch (err) {
          console.error("[POST /api/chat/messages] stream error:", err)
          const errorData = `event: error\ndata: ${JSON.stringify("An error occurred while generating the response")}\n\n`
          controller.enqueue(encoder.encode(errorData))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    console.error("[POST /api/chat/conversations/[id]/messages]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
