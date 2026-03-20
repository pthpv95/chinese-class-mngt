import { cn } from "@/lib/utils"
import type { ExerciseType, SubmissionStatus } from "@/lib/types"

const typeLabels: Record<ExerciseType, string> = {
  MCQ: "Quiz",
  FILL_BLANK: "Fill blank",
  SHORT_ANSWER: "Written",
  AUDIO_RECORDING: "Audio",
  FILE_UPLOAD: "Upload",
}

const typeColors: Record<ExerciseType, string> = {
  MCQ: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  FILL_BLANK: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  SHORT_ANSWER: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  AUDIO_RECORDING: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  FILE_UPLOAD: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
}

const statusColors: Record<SubmissionStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  SUBMITTED: "bg-pink-100 text-pink-800",
  GRADED: "bg-emerald-100 text-emerald-800",
}

const statusLabels: Record<SubmissionStatus, string> = {
  PENDING: "PENDING",
  SUBMITTED: "SUBMITTED",
  GRADED: "★ Graded",
}

interface ExerciseBadgeProps {
  type?: ExerciseType
  status?: SubmissionStatus
  className?: string
}

export function ExerciseBadge({ type, status, className }: ExerciseBadgeProps) {
  if (type) {
    return (
      <span
        className={cn(
          "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium",
          typeColors[type],
          className
        )}
      >
        {typeLabels[type]}
      </span>
    )
  }
  if (status) {
    return (
      <span
        className={cn(
          "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium",
          statusColors[status],
          className
        )}
      >
        {statusLabels[status]}
      </span>
    )
  }
  return null
}
