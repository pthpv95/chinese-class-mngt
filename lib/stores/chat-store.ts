import { create } from "zustand"
import type { ChatMessage, ChatConversation } from "@/lib/types"

interface ChatState {
  isOpen: boolean
  activeConversationId: string | null
  conversations: ChatConversation[]
  messages: ChatMessage[]
  isStreaming: boolean
  streamingContent: string

  // Actions
  setOpen: (open: boolean) => void
  toggleOpen: () => void
  setActiveConversation: (id: string | null) => void
  setConversations: (conversations: ChatConversation[]) => void
  setMessages: (messages: ChatMessage[]) => void
  addMessage: (message: ChatMessage) => void
  updateLastAssistantMessage: (content: string) => void
  setStreaming: (streaming: boolean) => void
  setStreamingContent: (content: string) => void
  appendStreamingContent: (delta: string) => void
  markActionExecuted: (messageId: string, actionIndex: number, result: unknown) => void
  reset: () => void
}

export const useChatStore = create<ChatState>((set) => ({
  isOpen: false,
  activeConversationId: null,
  conversations: [],
  messages: [],
  isStreaming: false,
  streamingContent: "",

  setOpen: (open) => set({ isOpen: open }),
  toggleOpen: () => set((s) => ({ isOpen: !s.isOpen })),
  setActiveConversation: (id) => set({ activeConversationId: id, messages: [] }),
  setConversations: (conversations) => set({ conversations }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
  updateLastAssistantMessage: (content) =>
    set((s) => {
      const msgs = [...s.messages]
      const lastIdx = msgs.length - 1
      const lastMsg = msgs[lastIdx]
      if (lastIdx >= 0 && lastMsg && lastMsg.role === "assistant") {
        msgs[lastIdx] = { ...lastMsg, content }
      }
      return { messages: msgs }
    }),
  setStreaming: (streaming) => set({ isStreaming: streaming }),
  setStreamingContent: (content) => set({ streamingContent: content }),
  appendStreamingContent: (delta) =>
    set((s) => ({ streamingContent: s.streamingContent + delta })),
  markActionExecuted: (messageId, actionIndex, result) =>
    set((s) => {
      const msgs = s.messages.map((msg) => {
        if (msg.id !== messageId || !msg.pendingActions) return msg
        const actions = [...msg.pendingActions]
        if (actions[actionIndex]) {
          actions[actionIndex] = { ...actions[actionIndex], executed: true, result }
        }
        return { ...msg, pendingActions: actions }
      })
      return { messages: msgs }
    }),
  reset: () =>
    set({
      activeConversationId: null,
      messages: [],
      isStreaming: false,
      streamingContent: "",
    }),
}))
