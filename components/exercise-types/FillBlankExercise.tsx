"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import type { FillBlankContent } from "@/lib/types"

interface FillBlankExerciseProps {
  exerciseId: string
  content: FillBlankContent
  existingAnswer: string | null
  readonly: boolean
}

export function FillBlankExercise({
  exerciseId,
  content,
  existingAnswer,
  readonly,
}: FillBlankExerciseProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const blankCount = (content.template.match(/___/g) ?? []).length
  const [answers, setAnswers] = useState<string[]>(() =>
    existingAnswer ? (JSON.parse(existingAnswer) as string[]) : Array(blankCount).fill("")
  )
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(!!existingAnswer)

  const parts = content.template.split("___")

  async function handleSubmit() {
    setSubmitting(true)
    await fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exerciseId, textAnswer: JSON.stringify(answers) }),
    })
    setSubmitted(true)
    setSubmitting(false)
    startTransition(() => router.refresh())
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < blankCount && (
              <input
                type="text"
                value={answers[i] ?? ""}
                onChange={(e) => {
                  const next = [...answers]
                  next[i] = e.target.value
                  setAnswers(next)
                }}
                disabled={readonly || submitted}
                className="inline-block w-28 mx-1 px-2 py-0.5 border-b-2 border-pink-400 bg-transparent text-pink-700 dark:text-pink-300 text-center text-sm focus:outline-none disabled:opacity-70"
                placeholder="..."
              />
            )}
          </span>
        ))}
      </div>

      {!readonly && !submitted && (
        <button
          onClick={handleSubmit}
          disabled={submitting || answers.some((a) => !a.trim())}
          className="px-4 py-2.5 bg-pink-500 hover:bg-pink-600 active:scale-95 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Submitting..." : "Submit ✓"}
        </button>
      )}
      {submitted && !readonly && (
        <p className="text-sm text-green-600 dark:text-green-400 font-medium">✓ Submitted</p>
      )}
    </div>
  )
}
