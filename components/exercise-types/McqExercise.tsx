"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import type { McqContent } from "@/lib/types"

interface McqExerciseProps {
  exerciseId: string
  content: McqContent
  existingAnswer: string | null
  readonly: boolean
}

export function McqExercise({
  exerciseId,
  content,
  existingAnswer,
  readonly,
}: McqExerciseProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [selected, setSelected] = useState<number[]>(() =>
    existingAnswer ? (JSON.parse(existingAnswer) as number[]) : []
  )
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(!!existingAnswer)

  async function handleSubmit() {
    setSubmitting(true)
    await fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exerciseId, textAnswer: JSON.stringify(selected) }),
    })
    setSubmitted(true)
    setSubmitting(false)
    startTransition(() => router.refresh())
  }

  if (!content?.questions?.length) {
    return <p className="text-sm text-gray-400">No questions have been added to this exercise yet.</p>
  }

  return (
    <div className="space-y-6">
      {content.questions.map((q, qi) => (
        <div key={qi}>
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            {qi + 1}. {q.text}
          </p>
          <div className="space-y-2">
            {q.options.map((opt, oi) => (
              <button
                key={oi}
                disabled={readonly || submitted}
                onClick={() => {
                  const next = [...selected]
                  next[qi] = oi
                  setSelected(next)
                }}
                className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${selected[qi] === oi
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300"
                  } disabled:cursor-not-allowed`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      ))}

      {!readonly && !submitted && (
        <button
          onClick={handleSubmit}
          disabled={submitting || selected.length !== content.questions.length}
          className="mt-4 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          {submitting ? "Submitting..." : "Submit answers"}
        </button>
      )}
      {submitted && !readonly && (
        <p className="text-sm text-green-600 dark:text-green-400 font-medium">
          ✓ Submitted — waiting for grading
        </p>
      )}
    </div>
  )
}
