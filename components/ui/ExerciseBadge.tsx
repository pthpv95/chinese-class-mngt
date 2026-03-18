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
  MCQ: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  FILL_BLANK: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  SHORT_ANSWER: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  AUDIO_RECORDING: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  FILE_UPLOAD: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
}

const statusColors: Record<SubmissionStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  SUBMITTED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  GRADED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
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
        {status}
      </span>
    )
  }
  return null
}
