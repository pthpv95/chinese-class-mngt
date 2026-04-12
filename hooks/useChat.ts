"use client"

import { useCallback } from "react"
import { useChatStore } from "@/lib/stores/chat-store"
import type { ChatMessage, ChatConversation, PendingAction } from "@/lib/types"

// Helper — read actions without subscribing to state changes
const getStore = () => useChatStore.getState()

export function useChat() {
  // Subscribe only to the values needed for rendering
  const isOpen = useChatStore((s) => s.isOpen)
  const activeConversationId = useChatStore((s) => s.activeConversationId)
  const conversations = useChatStore((s) => s.conversations)
  const messages = useChatStore((s) => s.messages)
  const isStreaming = useChatStore((s) => s.isStreaming)
  const streamingContent = useChatStore((s) => s.streamingContent)
  const toggleOpen = useChatStore((s) => s.toggleOpen)
  const setOpen = useChatStore((s) => s.setOpen)

  // All callbacks use getStore() so they don't depend on state and stay stable
  const loadConversations = useCallback(async () => {
    const res = await fetch("/api/chat/conversations")
    if (!res.ok) return
    const { data } = (await res.json()) as { data: ChatConversation[] }
    getStore().setConversations(data)
  }, [])

  const createConversation = useCallback(async (title?: string) => {
    const res = await fetch("/api/chat/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    })
    if (!res.ok) return null
    const { data } = (await res.json()) as { data: { id: string } }
    getStore().setActiveConversation(data.id)
    await loadConversations()
    return data.id
  }, [loadConversations])

  const loadMessages = useCallback(async (conversationId: string) => {
    getStore().setActiveConversation(conversationId)
    const res = await fetch(`/api/chat/conversations/${conversationId}`)
    if (!res.ok) return
    const { data } = (await res.json()) as { data: { messages: ChatMessage[] } }
    getStore().setMessages(data.messages)
  }, [])

  const deleteConversation = useCallback(async (conversationId: string) => {
    const res = await fetch(`/api/chat/conversations/${conversationId}`, {
      method: "DELETE",
    })
    if (!res.ok) return
    if (getStore().activeConversationId === conversationId) {
      getStore().reset()
    }
    await loadConversations()
  }, [loadConversations])

  const sendMessage = useCallback(
    async (content: string, imageUrls: string[] = []) => {
      let conversationId = getStore().activeConversationId

      // Auto-create conversation if none active
      if (!conversationId) {
        conversationId = await createConversation()
        if (!conversationId) return
      }

      // Track how many messages existed before the optimistic adds so we can roll back
      const messageCountBefore = getStore().messages.length

      const rollbackOptimisticMessages = () => {
        useChatStore.setState((s) => ({
          messages: s.messages.slice(0, messageCountBefore),
        }))
      }

      // Add optimistic user message
      const userMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        role: "user",
        content,
        imageUrls,
        toolCalls: null,
        pendingActions: null,
        createdAt: new Date(),
      }
      getStore().addMessage(userMessage)

      // Add placeholder assistant message
      const assistantMessage: ChatMessage = {
        id: `temp-assistant-${Date.now()}`,
        role: "assistant",
        content: "",
        imageUrls: [],
        toolCalls: null,
        pendingActions: null,
        createdAt: new Date(),
      }
      getStore().addMessage(assistantMessage)
      getStore().setStreaming(true)
      getStore().setStreamingContent("")

      try {
        const res = await fetch(
          `/api/chat/conversations/${conversationId}/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content, imageUrls }),
          }
        )

        if (!res.ok || !res.body) {
          rollbackOptimisticMessages()
          getStore().setStreaming(false)
          return
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""
        let fullContent = ""
        const pendingActions: PendingAction[] = []

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          // Parse SSE events from buffer
          const lines = buffer.split("\n")
          buffer = lines.pop() ?? "" // Keep incomplete line in buffer

          let eventType = ""
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7)
            } else if (line.startsWith("data: ")) {
              const data = JSON.parse(line.slice(6)) as string
              if (eventType === "text") {
                fullContent += data
                getStore().appendStreamingContent(data)
                getStore().updateLastAssistantMessage(fullContent)
              } else if (eventType === "pending_action") {
                const action = JSON.parse(data) as PendingAction
                pendingActions.push({ ...action, executed: false })
              }
            }
          }
        }

        // Finalize: attach pending actions to the last assistant message
        if (pendingActions.length > 0) {
          useChatStore.setState((s) => {
            const msgs = [...s.messages]
            const lastIdx = msgs.length - 1
            const lastMsg = msgs[lastIdx]
            if (lastIdx >= 0 && lastMsg && lastMsg.role === "assistant") {
              msgs[lastIdx] = { ...lastMsg, pendingActions }
            }
            return { messages: msgs }
          })
        }

        // Reload to get DB-persisted messages with real IDs
        await loadMessages(conversationId)
        await loadConversations()
      } catch {
        rollbackOptimisticMessages()
      } finally {
        getStore().setStreaming(false)
        getStore().setStreamingContent("")
      }
    },
    [createConversation, loadMessages, loadConversations]
  )

  const confirmAction = useCallback(
    async (
      messageId: string,
      actionIndex: number,
      editedInput?: Record<string, unknown>
    ) => {
      const conversationId = getStore().activeConversationId
      if (!conversationId) return null

      const res = await fetch(
        `/api/chat/conversations/${conversationId}/confirm`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId, actionIndex, editedInput }),
        }
      )

      if (!res.ok) return null

      const { data } = (await res.json()) as { data: unknown }
      getStore().markActionExecuted(messageId, actionIndex, data)
      return data
    },
    []
  )

  return {
    // State
    isOpen,
    activeConversationId,
    conversations,
    messages,
    isStreaming,
    streamingContent,

    // Stable actions
    toggleOpen,
    setOpen,
    loadConversations,
    createConversation,
    loadMessages,
    deleteConversation,
    sendMessage,
    confirmAction,
  }
}
