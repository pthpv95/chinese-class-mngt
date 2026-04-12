"use client"

import type { ChatMessage as ChatMessageType } from "@/lib/types"
import { ChatConfirmAction } from "./ChatConfirmAction"

interface ChatMessageProps {
  message: ChatMessageType
  onConfirm: (messageId: string, actionIndex: number) => Promise<unknown>
  isStreaming?: boolean
}

export function ChatMessage({ message, onConfirm, isStreaming }: ChatMessageProps) {
  const isUser = message.role === "user"

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-blue-600 text-white"
            : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        }`}
      >
        {/* Image thumbnails */}
        {message.imageUrls.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {message.imageUrls.map((url, i) => (
              <div
                key={i}
                className="w-20 h-20 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-500"
              >
                Image {i + 1}
              </div>
            ))}
          </div>
        )}

        {/* Message content */}
        <div className="whitespace-pre-wrap">
          {message.content}
          {isStreaming && message.role === "assistant" && (
            <span className="inline-block w-1.5 h-4 bg-gray-400 dark:bg-gray-500 ml-0.5 animate-pulse" />
          )}
        </div>

        {/* Pending actions */}
        {message.pendingActions && message.pendingActions.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.pendingActions.map((action, index) => (
              <ChatConfirmAction
                key={action.toolCallId}
                action={action}
                onConfirm={() => onConfirm(message.id, index)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
