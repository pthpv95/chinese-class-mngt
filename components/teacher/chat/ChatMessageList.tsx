"use client"

import { useRef, useEffect } from "react"
import type { ChatMessage as ChatMessageType } from "@/lib/types"
import { ChatMessage } from "./ChatMessage"

interface ChatMessageListProps {
  messages: ChatMessageType[]
  isStreaming: boolean
  onConfirmAction: (messageId: string, actionIndex: number) => Promise<unknown>
}

export function ChatMessageList({ messages, isStreaming, onConfirmAction }: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isStreaming])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center">
        <div>
          <div className="text-3xl mb-3">&#x1F393;</div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Teaching Assistant
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-[220px]">
            Ask me to create exercises, upload a textbook image, or get help managing your classes.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {messages.map((msg, i) => (
        <ChatMessage
          key={msg.id}
          message={msg}
          onConfirm={onConfirmAction}
          isStreaming={isStreaming && i === messages.length - 1 && msg.role === "assistant"}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
