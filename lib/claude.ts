import Anthropic from "@anthropic-ai/sdk"
import { env } from "@/lib/env"
import type { ToolCall, PendingAction } from "@/lib/types"
import { executeReadOnlyTool, isReadOnlyTool } from "@/lib/chat-tools"

const client = new Anthropic({ apiKey: env.anthropicApiKey })

const SYSTEM_PROMPT = `You are a teaching assistant for an e-learning platform. You help teachers create exercises, manage their classes, and review student submissions.

When the teacher asks you to create an exercise, use the create_exercise tool. When they share an image of a textbook page or any educational content, analyze it and suggest exercises based on the content.

Important rules:
- Always ask the teacher which class the exercise is for if not specified. Use list_classes to show their available classes.
- Generate exercises that match the content JSON schemas exactly:
  - MCQ: { "questions": [{ "text": "...", "options": ["A", "B", "C", "D"], "answer": 0 }] } where answer is the 0-based index of the correct option
  - FILL_BLANK: { "template": "She ___ (go) to school.", "answers": ["goes"] } where ___ marks each blank
  - SHORT_ANSWER: { "prompt": "...", "sampleAnswer": "..." }
- For MCQ: always provide exactly 4 options per question
- Create exercises as drafts — the teacher will review and publish them
- When adding a student to a class, use add_student_to_class. The student must already have an account. You can look them up by email or user ID.
- Be conversational and helpful. Explain what you are creating and why.
- When listing classes, present them clearly so the teacher can choose.`

const TOOLS: Anthropic.Tool[] = [
  {
    name: "list_classes",
    description:
      "List all classes taught by this teacher, including student count and exercise count. Use this when the teacher asks about their classes or when you need to know which class to target for an exercise.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "create_exercise",
    description:
      "Create a new exercise for a class. The exercise is saved as a draft for the teacher to review before publishing. Use this when the teacher asks you to generate questions or exercises.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: {
          type: "string",
          description: "Exercise title",
        },
        type: {
          type: "string",
          enum: ["MCQ", "FILL_BLANK", "SHORT_ANSWER"],
          description: "Exercise type",
        },
        classId: {
          type: "string",
          description: "ID of the class to create the exercise for",
        },
        description: {
          type: "string",
          description: "Optional exercise description",
        },
        dueDate: {
          type: "string",
          description: "Optional ISO date string for the due date",
        },
        content: {
          type: "object",
          description:
            "Exercise content matching the type schema. MCQ: { questions: [{ text, options, answer }] }. FILL_BLANK: { template, answers }. SHORT_ANSWER: { prompt, sampleAnswer }.",
        },
      },
      required: ["title", "type", "classId", "content"],
    },
  },
  {
    name: "add_student_to_class",
    description:
      "Add an existing student to a class by their email address or user ID. The student must already have an account on the platform. The teacher will confirm before the enrollment is created.",
    input_schema: {
      type: "object" as const,
      properties: {
        classId: {
          type: "string",
          description: "ID of the class to enroll the student in",
        },
        email: {
          type: "string",
          description: "Email address of the student to add (use this OR studentId)",
        },
        studentId: {
          type: "string",
          description: "User ID of the student to add (use this OR email)",
        },
      },
      required: ["classId"],
    },
  },
]

interface ConversationMessage {
  role: "user" | "assistant"
  content: string | Anthropic.ContentBlockParam[]
}

// Max messages to send to Claude (sliding window)
const MAX_HISTORY_MESSAGES = 20

export function buildClaudeMessages(
  dbMessages: Array<{
    role: string
    content: string
    imageUrls: string[]
    toolCalls: unknown
    toolResults: unknown
  }>,
  newContent: string,
  imageBase64Blocks: Anthropic.ImageBlockParam[],
  historicalImageBlocks: Anthropic.ImageBlockParam[][]
): ConversationMessage[] {
  const messages: ConversationMessage[] = []

  // Convert DB messages to Claude format (sliding window)
  const recentMessages = dbMessages.slice(-MAX_HISTORY_MESSAGES)
  for (let i = 0; i < recentMessages.length; i++) {
    const msg = recentMessages[i]!
    if (msg.role === "user") {
      const imgBlocks = historicalImageBlocks[i] ?? []
      if (imgBlocks.length > 0) {
        messages.push({
          role: "user",
          content: [
            ...imgBlocks,
            { type: "text", text: msg.content },
          ],
        })
      } else {
        messages.push({ role: "user", content: msg.content })
      }
    } else if (msg.role === "assistant") {
      messages.push({ role: "assistant", content: msg.content })
    }
  }

  // Add the new user message
  if (imageBase64Blocks.length > 0) {
    messages.push({
      role: "user",
      content: [
        ...imageBase64Blocks,
        { type: "text", text: newContent },
      ],
    })
  } else {
    messages.push({ role: "user", content: newContent })
  }

  return messages
}

export interface StreamEvent {
  type: "text" | "tool_result" | "pending_action" | "done" | "error"
  data: string
}

export async function streamChatResponse(
  messages: ConversationMessage[],
  teacherId: string,
  onEvent: (event: StreamEvent) => void
): Promise<{ content: string; toolCalls: ToolCall[]; pendingActions: PendingAction[] }> {
  let fullContent = ""
  const toolCalls: ToolCall[] = []
  const pendingActions: PendingAction[] = []

  const stream = await client.messages.stream({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools: TOOLS,
    messages,
  })

  for await (const event of stream) {
    if (event.type === "content_block_delta") {
      if (event.delta.type === "text_delta") {
        fullContent += event.delta.text
        onEvent({ type: "text", data: event.delta.text })
      }
    }
  }

  // After stream completes, check for tool use in the final message
  const finalMessage = await stream.finalMessage()

  for (const block of finalMessage.content) {
    if (block.type === "tool_use") {
      const toolCall: ToolCall = {
        id: block.id,
        name: block.name,
        input: block.input as Record<string, unknown>,
      }
      toolCalls.push(toolCall)

      if (isReadOnlyTool(block.name)) {
        // Execute read-only tools immediately
        const result = await executeReadOnlyTool(block.name, teacherId, block.input as Record<string, unknown>)
        onEvent({
          type: "tool_result",
          data: JSON.stringify({ toolName: block.name, result }),
        })

        // Continue the conversation with the tool result
        const continuationMessages: ConversationMessage[] = [
          ...messages,
          {
            role: "assistant",
            content: finalMessage.content as unknown as Anthropic.ContentBlockParam[],
          },
          {
            role: "user",
            content: [
              {
                type: "tool_result",
                tool_use_id: block.id,
                content: JSON.stringify(result),
              } as unknown as Anthropic.ContentBlockParam,
            ],
          },
        ]

        // Stream the follow-up response
        const followUpStream = await client.messages.stream({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          tools: TOOLS,
          messages: continuationMessages,
        })

        for await (const followEvent of followUpStream) {
          if (followEvent.type === "content_block_delta") {
            if (followEvent.delta.type === "text_delta") {
              fullContent += followEvent.delta.text
              onEvent({ type: "text", data: followEvent.delta.text })
            }
          }
        }

        // Check follow-up for more tool calls
        const followUpMessage = await followUpStream.finalMessage()
        for (const followBlock of followUpMessage.content) {
          if (followBlock.type === "tool_use") {
            const followToolCall: ToolCall = {
              id: followBlock.id,
              name: followBlock.name,
              input: followBlock.input as Record<string, unknown>,
            }
            toolCalls.push(followToolCall)

            if (!isReadOnlyTool(followBlock.name)) {
              pendingActions.push({
                toolCallId: followBlock.id,
                toolName: followBlock.name,
                input: followBlock.input as Record<string, unknown>,
                executed: false,
              })
              onEvent({
                type: "pending_action",
                data: JSON.stringify({
                  toolCallId: followBlock.id,
                  toolName: followBlock.name,
                  input: followBlock.input as Record<string, unknown>,
                }),
              })
            }
          }
        }
      } else {
        // Mutating tool — add as pending action
        pendingActions.push({
          toolCallId: block.id,
          toolName: block.name,
          input: block.input as Record<string, unknown>,
          executed: false,
        })
        onEvent({
          type: "pending_action",
          data: JSON.stringify({
            toolCallId: block.id,
            toolName: block.name,
            input: block.input as Record<string, unknown>,
          }),
        })
      }
    }
  }

  onEvent({ type: "done", data: "" })

  return { content: fullContent, toolCalls, pendingActions }
}
