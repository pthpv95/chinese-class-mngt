export type UserRole = "TEACHER" | "STUDENT"
export type ExerciseType =
  | "MCQ"
  | "FILL_BLANK"
  | "SHORT_ANSWER"
  | "AUDIO_RECORDING"
  | "FILE_UPLOAD"
export type SubmissionStatus = "PENDING" | "SUBMITTED" | "GRADED"

// Exercise content shapes
export interface McqContent {
  questions: Array<{
    text: string
    options: string[]
    answer: number // index of correct option
  }>
}

export interface FillBlankContent {
  template: string // "The capital of ___ is ___."
  answers: string[]
}

export interface ShortAnswerContent {
  prompt: string
  sampleAnswer?: string
}

export interface AudioRecordingContent {
  prompt: string
  maxDurationSec: number
  allowUpload: boolean
}

export type ExerciseContent =
  | McqContent
  | FillBlankContent
  | ShortAnswerContent
  | AudioRecordingContent

// Component prop shapes (used by AGENT-STUDENT and AGENT-TEACHER)
export interface ExerciseListItem {
  id: string
  title: string
  type: ExerciseType
  dueDate: Date | null
  submissionStatus: SubmissionStatus | null
  className: string
}

export interface SubmissionListItem {
  id: string
  studentName: string
  exerciseTitle: string
  status: SubmissionStatus
  score: number | null
  submittedAt: Date | null
}

// Chat types
export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  imageUrls: string[]
  toolCalls: ToolCall[] | null
  pendingActions: PendingAction[] | null
  createdAt: Date
}

export interface ToolCall {
  id: string
  name: string
  input: Record<string, unknown>
}

export interface PendingAction {
  toolCallId: string
  toolName: string
  input: Record<string, unknown>
  executed: boolean
  result?: unknown
}

export interface ChatConversation {
  id: string
  title: string | null
  createdAt: Date
  updatedAt: Date
  messageCount: number
}
