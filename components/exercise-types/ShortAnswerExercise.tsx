"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import type { ShortAnswerContent } from "@/lib/types"

interface ShortAnswerExerciseProps {
  exerciseId: string
  content: ShortAnswerContent
  existingAnswer: string | null
  readonly: boolean
}

export function ShortAnswerExercise({
  exerciseId,
  content,
  existingAnswer,
  readonly,
}: ShortAnswerExerciseProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [answer, setAnswer] = useState(existingAnswer ?? "")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(!!existingAnswer)

  async function handleSubmit() {
    setSubmitting(true)
    await fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exerciseId, textAnswer: answer }),
    })
    setSubmitted(true)
    setSubmitting(false)
    startTransition(() => router.refresh())
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-700 dark:text-gray-300">{content.prompt}</p>
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        disabled={readonly || submitted}
        rows={5}
        className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70 resize-none"
        placeholder="Type your answer here..."
      />
      {!readonly && !submitted && (
        <button
          onClick={handleSubmit}
          disabled={submitting || !answer.trim()}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          {submitting ? "Submitting..." : "Submit"}
        </button>
      )}
      {submitted && !readonly && (
        <p className="text-sm text-green-600 dark:text-green-400 font-medium">✓ Submitted</p>
      )}
    </div>
  )
}
