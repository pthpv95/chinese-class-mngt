"use client"

import { useEffect, useState, useCallback } from "react"
import { useChat } from "@/hooks/useChat"
import { ChatMessageList } from "./ChatMessageList"
import { ChatInput } from "./ChatInput"
import { ConversationList } from "./ConversationList"

export function ChatPanel() {
  const {
    isOpen,
    toggleOpen,
    setOpen,
    activeConversationId,
    conversations,
    messages,
    isStreaming,
    loadConversations,
    createConversation,
    loadMessages,
    deleteConversation,
    sendMessage,
    confirmAction,
  } = useChat()

  const [showSidebar, setShowSidebar] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadConversations()
    }
  }, [isOpen, loadConversations])

  const handleImageUpload = useCallback(async (file: File): Promise<string | null> => {
    try {
      const res = await fetch("/api/chat/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mimeType: file.type,
          fileSizeBytes: file.size,
        }),
      })

      if (!res.ok) return null
      const { data } = (await res.json()) as { data: { signedUrl: string; filePath: string } }

      // Upload directly to S3
      const uploadRes = await fetch(data.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      })

      if (!uploadRes.ok) return null
      return data.filePath
    } catch {
      return null
    }
  }, [])

  const handleNewConversation = useCallback(async () => {
    await createConversation()
    setShowSidebar(false)
  }, [createConversation])

  const handleSelectConversation = useCallback(
    async (id: string) => {
      await loadMessages(id)
      setShowSidebar(false)
    },
    [loadMessages]
  )

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) setOpen(false)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, setOpen])

  return (
    <>
      {/* FAB button */}
      <button
        onClick={toggleOpen}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all flex items-center justify-center"
        title="Teaching Assistant"
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-40 w-[420px] h-[600px] max-h-[80vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex overflow-hidden">
          {/* Conversation sidebar */}
          {showSidebar && (
            <div className="w-[180px] border-r border-gray-200 dark:border-gray-700 flex-shrink-0">
              <ConversationList
                conversations={conversations}
                activeId={activeConversationId}
                onSelect={handleSelectConversation}
                onDelete={deleteConversation}
                onNew={handleNewConversation}
              />
            </div>
          )}

          {/* Main chat area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
                title="Conversations"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </button>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  Teaching Assistant
                </h3>
              </div>
              {activeConversationId && (
                <button
                  onClick={handleNewConversation}
                  className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
                  title="New chat"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                  </svg>
                </button>
              )}
            </div>

            {/* Messages */}
            <ChatMessageList
              messages={messages}
              isStreaming={isStreaming}
              onConfirmAction={confirmAction}
            />

            {/* Input */}
            <ChatInput
              onSend={sendMessage}
              onImageUpload={handleImageUpload}
              disabled={isStreaming}
            />
          </div>
        </div>
      )}
    </>
  )
}
