"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAudioPlayer } from "@/hooks/useAudioPlayer"
import { formatDuration } from "@/lib/audio-upload"
import type { ExerciseType } from "@/lib/types"

interface SubmissionReviewerProps {
  submissionId: string
  exerciseType: ExerciseType
  textAnswer: string | null
  audioUrl: string | null
  audioDurationSec: number | null
  content: Record<string, unknown>
  currentScore: number | null
  currentComment: string | null
  status: "SUBMITTED" | "GRADED"
}

export function SubmissionReviewer({
  submissionId,
  exerciseType,
  textAnswer,
  audioUrl,
  audioDurationSec,
  currentScore,
  currentComment,
  status,
}: SubmissionReviewerProps) {
  const router = useRouter()
  const [score, setScore] = useState(currentScore ?? 0)
  const [comment, setComment] = useState(currentComment ?? "")
  const [submitting, setSubmitting] = useState(false)

  async function handleGrade() {
    setSubmitting(true)
    await fetch(`/api/submissions/${submissionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score, teacherComment: comment }),
    })
    setSubmitting(false)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Student answer */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-pink-100 dark:border-gray-800 p-6">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
          Student answer
        </h3>

        {exerciseType === "AUDIO_RECORDING" && audioUrl ? (
          <AudioPlayer audioUrl={audioUrl} durationSec={audioDurationSec} />
        ) : textAnswer ? (
          <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
            {textAnswer}
          </p>
        ) : (
          <p className="text-sm text-gray-400">No answer submitted</p>
        )}
      </div>

      {/* Grading form */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Grade</h3>

        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1.5">Score (0–100)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={score}
            onChange={(e) => setScore(Number(e.target.value))}
            className="w-24 rounded-lg border border-pink-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-400"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1.5">
            Comment for student
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-pink-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-400 resize-none"
            placeholder="Great effort! Consider..."
          />
        </div>

        <button
          onClick={handleGrade}
          disabled={submitting}
          className="px-4 py-2.5 bg-pink-500 hover:bg-pink-600 active:scale-95 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Saving..." : status === "GRADED" ? "Update grade" : "Submit grade"}
        </button>
      </div>
    </div>
  )
}

function AudioPlayer({
  audioUrl,
  durationSec,
}: {
  audioUrl: string
  durationSec: number | null
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { playing, duration, currentTime, ready, togglePlay } = useAudioPlayer(
    containerRef,
    audioUrl
  )

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        className="w-full rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800 p-2"
      />
      <div className="flex items-center gap-4">
        <button
          onClick={togglePlay}
          disabled={!ready}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white transition-colors"
        >
          {playing ? (
            <span className="flex gap-0.5">
              <span className="w-1 h-4 bg-white rounded" />
              <span className="w-1 h-4 bg-white rounded" />
            </span>
          ) : (
            <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
          )}
        </button>
        <span className="text-xs text-gray-500 tabular-nums">
          {formatDuration(currentTime)} / {formatDuration(duration || durationSec || 0)}
        </span>
        {!ready && <span className="text-xs text-gray-400">Loading...</span>}
      </div>
    </div>
  )
}
