"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ExerciseBadge } from "@/components/ui/ExerciseBadge"
import type { ExerciseType } from "@/lib/types"

interface Student {
  id: string
  name: string
  email: string
}

interface ExerciseRow {
  id: string
  title: string
  type: string
  published: boolean
  dueDate: string | null
  createdAt: string
  submittedStudentIds: string[]
  gradedStudentIds: string[]
}

interface Props {
  exercises: ExerciseRow[]
  students: Student[]
  classId: string
}

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function groupByDate(exercises: ExerciseRow[]): { label: string; items: ExerciseRow[] }[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const groups = new Map<string, ExerciseRow[]>()
  for (const ex of exercises) {
    const d = new Date(ex.createdAt)
    d.setHours(0, 0, 0, 0)
    let label: string
    if (d.getTime() === today.getTime()) label = "Today"
    else if (d.getTime() === yesterday.getTime()) label = "Yesterday"
    else
      label = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label)!.push(ex)
  }
  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }))
}

function CompletionPopup({
  exercise,
  students,
  onClose,
}: {
  exercise: ExerciseRow
  students: Student[]
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [onClose])

  const submittedSet = new Set(exercise.submittedStudentIds)
  const gradedSet = new Set(exercise.gradedStudentIds)
  const done = students.filter((s) => submittedSet.has(s.id) || gradedSet.has(s.id))
  const pending = students.filter((s) => !submittedSet.has(s.id) && !gradedSet.has(s.id))

  return (
    <div
      ref={ref}
      className="absolute right-0 top-8 z-50 w-64 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl p-4"
    >
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Completion — {done.length}/{students.length}
      </p>

      {done.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1.5">
            ✓ Submitted ({done.length})
          </p>
          <div className="space-y-1.5">
            {done.map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                  {initials(s.name)}
                </span>
                <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{s.name}</span>
                {gradedSet.has(s.id) && (
                  <span className="ml-auto text-[10px] text-blue-500 font-medium">Graded</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {pending.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-400 mb-1.5">○ Not submitted ({pending.length})</p>
          <div className="space-y-1.5">
            {pending.map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                  {initials(s.name)}
                </span>
                <span className="text-xs text-gray-400 truncate">{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {students.length === 0 && (
        <p className="text-xs text-gray-400">No students enrolled.</p>
      )}
    </div>
  )
}

function ExerciseRow({
  exercise,
  students,
}: {
  exercise: ExerciseRow
  students: Student[]
}) {
  const router = useRouter()
  const [popupOpen, setPopupOpen] = useState(false)
  const [publishing, setPublishing] = useState(false)

  async function handlePublish() {
    setPublishing(true)
    await fetch(`/api/exercises/${exercise.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: true }),
    })
    router.refresh()
    setPublishing(false)
  }

  const submittedSet = new Set([...exercise.submittedStudentIds, ...exercise.gradedStudentIds])
  const completedCount = students.filter((s) => submittedSet.has(s.id)).length
  const total = students.length

  const dueDate = exercise.dueDate
    ? new Date(exercise.dueDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null

  const isOverdue =
    exercise.dueDate && new Date(exercise.dueDate) < new Date() && exercise.published

  return (
    <div className={`flex items-center gap-4 px-4 py-3 bg-white dark:bg-gray-900 rounded-xl border transition-colors ${
      exercise.published
        ? "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
        : "border-dashed border-gray-300 dark:border-gray-700 border-l-4 border-l-amber-400"
    }`}>
      {/* Type + Title */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <ExerciseBadge type={exercise.type as ExerciseType} />
        <span className={`text-sm font-medium truncate ${exercise.published ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"}`}>
          {exercise.title}
        </span>
        {!exercise.published && (
          <span className="flex-shrink-0 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded font-medium">
            Draft
          </span>
        )}
      </div>

      {/* Due date */}
      <div className="flex-shrink-0 w-20 text-right">
        {dueDate && (
          <span className={`text-xs ${isOverdue ? "text-red-500" : "text-gray-400"}`}>
            {isOverdue ? "Overdue" : `Due ${dueDate}`}
          </span>
        )}
      </div>

      {/* Publish button (drafts only) */}
      {!exercise.published && (
        <button
          onClick={handlePublish}
          disabled={publishing}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed min-w-[84px] justify-center"
        >
          {publishing ? (
            <>
              <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Publishing…
            </>
          ) : (
            "↑ Publish"
          )}
        </button>
      )}

      {/* Completion avatars (published only) */}
      {exercise.published && total > 0 && (
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setPopupOpen((v) => !v)}
            className="flex items-center gap-1.5 group"
            title="View completion"
          >
            <div className="flex -space-x-1.5">
              {students.slice(0, 5).map((s) => {
                const done = submittedSet.has(s.id)
                return (
                  <span
                    key={s.id}
                    title={s.name}
                    className={`w-6 h-6 rounded-full border-2 border-white dark:border-gray-900 text-[9px] font-bold flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 ${
                      done
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {initials(s.name)}
                  </span>
                )
              })}
              {total > 5 && (
                <span className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-900 bg-gray-100 dark:bg-gray-800 text-gray-500 text-[9px] font-bold flex items-center justify-center">
                  +{total - 5}
                </span>
              )}
            </div>
            <span className="text-xs text-gray-400 tabular-nums">
              {completedCount}/{total}
            </span>
          </button>

          {popupOpen && (
            <CompletionPopup
              exercise={exercise}
              students={students}
              onClose={() => setPopupOpen(false)}
            />
          )}
        </div>
      )}

      {/* View link */}
      <Link
        href={`/teacher/submissions?exerciseId=${exercise.id}`}
        className="flex-shrink-0 text-xs text-blue-600 hover:text-blue-700 font-medium"
      >
        View →
      </Link>
    </div>
  )
}

export function ExercisesByDate({ exercises, students, classId }: Props) {
  const groups = groupByDate(exercises)

  if (exercises.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-gray-400">No exercises yet.</p>
        <Link
          href={`/teacher/exercises/new?classId=${classId}`}
          className="mt-3 inline-block text-sm text-blue-600 hover:underline"
        >
          Create your first exercise →
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {groups.map(({ label, items }) => (
        <div key={label}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
              {label}
            </span>
            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
          </div>
          <div className="space-y-2">
            {items.map((ex) => (
              <ExerciseRow key={ex.id} exercise={ex} students={students} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
