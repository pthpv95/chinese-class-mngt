"use client"

import { useState } from "react"
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
  const blankCount = (content.template.match(/___/g) ?? []).length
  const parsedAnswers: string[] = existingAnswer
    ? (JSON.parse(existingAnswer) as string[])
    : Array(blankCount).fill("")
  const [answers, setAnswers] = useState<string[]>(parsedAnswers)
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
    router.refresh()
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
                className="inline-block w-28 mx-1 px-2 py-0.5 border-b-2 border-blue-400 bg-transparent text-blue-700 dark:text-blue-300 text-center text-sm focus:outline-none disabled:opacity-70"
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
