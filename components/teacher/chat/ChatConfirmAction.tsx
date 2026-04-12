"use client"

import { useState } from "react"
import type { PendingAction } from "@/lib/types"
import { ExercisePreview } from "./ExercisePreview"

interface ChatConfirmActionProps {
  action: PendingAction
  onConfirm: () => Promise<unknown>
}

export function ChatConfirmAction({ action, onConfirm }: ChatConfirmActionProps) {
  const [confirming, setConfirming] = useState(false)
  const [failed, setFailed] = useState(false)

  if (action.executed) {
    const result = action.result as { success?: boolean; data?: { id?: string } } | undefined
    return (
      <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 p-3 text-xs">
        <div className="flex items-center gap-1.5 text-green-700 dark:text-green-400 font-medium">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          {action.toolName === "create_exercise"
            ? "Exercise created as draft"
            : action.toolName === "add_student_to_class"
            ? `${(action.result as { data?: { studentName?: string } } | undefined)?.data?.studentName ?? "Student"} added to class`
            : "Action completed"}
        </div>
        {result?.success && result.data?.id && (
          <a
            href={`/teacher/classes/${(action.input as { classId?: string }).classId}`}
            className="mt-1 inline-block text-green-600 dark:text-green-400 underline"
          >
            View in class
          </a>
        )}
      </div>
    )
  }

  const handleConfirm = async () => {
    setConfirming(true)
    setFailed(false)
    try {
      await onConfirm()
    } catch {
      setFailed(true)
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 p-3">
      <div className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-2">
        {action.toolName === "create_exercise"
          ? "Create exercise (draft)"
          : action.toolName === "add_student_to_class"
          ? "Add student to class"
          : `Action: ${action.toolName}`}
      </div>

      {action.toolName === "create_exercise" && (
        <ExercisePreview input={action.input} />
      )}

      {action.toolName === "add_student_to_class" && (
        <div className="text-xs space-y-1">
          {(typeof action.input.email === "string" || typeof action.input.studentId === "string") && (
            <div>
              <span className="text-gray-500 dark:text-gray-400">Student:</span>{" "}
              <span className="font-medium">
                {typeof action.input.email === "string"
                  ? action.input.email
                  : String(action.input.studentId)}
              </span>
            </div>
          )}
          {typeof action.input.classId === "string" && (
            <div>
              <span className="text-gray-500 dark:text-gray-400">Class ID:</span>{" "}
              <span className="font-mono text-amber-700 dark:text-amber-400 text-[11px]">
                {action.input.classId}
              </span>
            </div>
          )}
        </div>
      )}

      {failed && (
        <div className="text-xs text-red-600 dark:text-red-400 mt-2">
          Something went wrong. Please try again.
        </div>
      )}
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleConfirm}
          disabled={confirming}
          className="px-3 py-1 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {confirming ? "Creating..." : failed ? "Retry" : "Confirm"}
        </button>
      </div>
    </div>
  )
}
