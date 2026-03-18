# instructions/05-student-ui.md
# AGENT-STUDENT — Student UI

## Objective
Build all student-facing pages and exercise components. Use mock data from
`lib/mock-data.ts` for development; wire up real API calls after AGENT-API confirms complete.

---

## Shared Dashboard Layout

### app/(dashboard)/layout.tsx

```tsx
import { requireSession } from "@/lib/auth-helpers"
import Link from "next/link"
import { signOut } from "@/auth"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession()
  const isTeacher = session.user.role === "TEACHER"

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
        <div className="px-5 py-5 border-b border-gray-100 dark:border-gray-800">
          <h1 className="text-base font-semibold text-gray-900 dark:text-white">EduFlow</h1>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{session.user.email}</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {isTeacher ? (
            <>
              <SidebarLink href="/teacher" label="Dashboard" />
              <SidebarLink href="/teacher/exercises/new" label="New exercise" />
            </>
          ) : (
            <>
              <SidebarLink href="/student" label="My exercises" />
            </>
          )}
        </nav>

        <div className="p-3 border-t border-gray-100 dark:border-gray-800">
          <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }) }}>
            <button type="submit" className="w-full text-left text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}

function SidebarLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-2 rounded-lg transition-colors"
    >
      {label}
    </Link>
  )
}
```

---

## Student Dashboard

### app/(dashboard)/student/page.tsx

```tsx
import { requireStudent } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { ExerciseBadge } from "@/components/ui/ExerciseBadge"
import { DueDateCountdown } from "@/components/ui/DueDateCountdown"
import { formatDate } from "@/lib/utils"
import type { ExerciseType, SubmissionStatus } from "@/lib/types"

export const metadata = { title: "My Exercises — EduFlow" }

export default async function StudentDashboard() {
  const session = await requireStudent()

  const exercises = await prisma.exercise.findMany({
    where: {
      published: true,
      class: { enrollments: { some: { studentId: session.user.id } } },
    },
    include: {
      class: { select: { name: true } },
      submissions: {
        where: { studentId: session.user.id },
        select: { id: true, status: true, score: true },
      },
    },
    orderBy: { dueDate: "asc" },
  })

  const pending = exercises.filter(e => !e.submissions[0] || e.submissions[0].status === "SUBMITTED")
  const completed = exercises.filter(e => e.submissions[0]?.status === "GRADED")

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">My exercises</h2>

      {pending.length === 0 && completed.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <p className="text-sm">No exercises yet. Ask your teacher for the class code to join.</p>
        </div>
      )}

      {pending.length > 0 && (
        <section className="mb-8">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
            Pending ({pending.length})
          </h3>
          <div className="space-y-3">
            {pending.map(ex => (
              <Link
                key={ex.id}
                href={`/student/exercises/${ex.id}`}
                className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <ExerciseBadge type={ex.type as ExerciseType} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {ex.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{ex.class.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {ex.dueDate && <DueDateCountdown dueDate={ex.dueDate} />}
                  <ExerciseBadge status={(ex.submissions[0]?.status ?? "PENDING") as SubmissionStatus} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {completed.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
            Graded ({completed.length})
          </h3>
          <div className="space-y-3">
            {completed.map(ex => (
              <Link
                key={ex.id}
                href={`/student/exercises/${ex.id}`}
                className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <ExerciseBadge type={ex.type as ExerciseType} />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{ex.title}</p>
                    <p className="text-xs text-gray-500">{ex.class.name} · {ex.dueDate ? formatDate(ex.dueDate) : "No due date"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {ex.submissions[0]?.score !== null && (
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                      {ex.submissions[0]?.score}/100
                    </span>
                  )}
                  <ExerciseBadge status="GRADED" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
```

---

## Exercise Page (Take Exercise)

### app/(dashboard)/student/exercises/[id]/page.tsx

```tsx
import { requireStudent } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { McqExercise } from "@/components/exercise-types/McqExercise"
import { FillBlankExercise } from "@/components/exercise-types/FillBlankExercise"
import { ShortAnswerExercise } from "@/components/exercise-types/ShortAnswerExercise"
import { AudioRecorderExercise } from "@/components/exercise-types/AudioRecorderExercise"
import type { ExerciseType, McqContent, FillBlankContent, ShortAnswerContent, AudioRecordingContent } from "@/lib/types"

export default async function ExercisePage({ params }: { params: { id: string } }) {
  const session = await requireStudent()

  const exercise = await prisma.exercise.findUnique({
    where: { id: params.id, published: true },
    include: {
      class: { select: { name: true } },
      submissions: {
        where: { studentId: session.user.id },
        select: { id: true, status: true, score: true, teacherComment: true, textAnswer: true, audioUrl: true },
      },
    },
  })

  if (!exercise) notFound()

  const submission = exercise.submissions[0] ?? null
  const isGraded = submission?.status === "GRADED"

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <p className="text-xs text-gray-500 mb-1">{exercise.class.name}</p>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{exercise.title}</h2>
      </div>

      {isGraded && submission && (
        <div className="mb-6 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <p className="text-sm font-medium text-green-800 dark:text-green-300">
            Graded: {submission.score}/100
          </p>
          {submission.teacherComment && (
            <p className="text-sm text-green-700 dark:text-green-400 mt-1">{submission.teacherComment}</p>
          )}
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        {exercise.type === "MCQ" && (
          <McqExercise
            exerciseId={exercise.id}
            content={exercise.content as unknown as McqContent}
            existingAnswer={submission?.textAnswer ?? null}
            readonly={isGraded}
          />
        )}
        {exercise.type === "FILL_BLANK" && (
          <FillBlankExercise
            exerciseId={exercise.id}
            content={exercise.content as unknown as FillBlankContent}
            existingAnswer={submission?.textAnswer ?? null}
            readonly={isGraded}
          />
        )}
        {exercise.type === "SHORT_ANSWER" && (
          <ShortAnswerExercise
            exerciseId={exercise.id}
            content={exercise.content as unknown as ShortAnswerContent}
            existingAnswer={submission?.textAnswer ?? null}
            readonly={isGraded}
          />
        )}
        {exercise.type === "AUDIO_RECORDING" && (
          <AudioRecorderExercise
            exerciseId={exercise.id}
            studentId={session.user.id}
            content={exercise.content as unknown as AudioRecordingContent}
            existingAudioUrl={submission?.audioUrl ?? null}
            readonly={isGraded}
          />
        )}
      </div>
    </div>
  )
}
```

---

## Exercise Type Components

### components/exercise-types/McqExercise.tsx

```tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { McqContent } from "@/lib/types"

interface McqExerciseProps {
  exerciseId: string
  content: McqContent
  existingAnswer: string | null
  readonly: boolean
}

export function McqExercise({ exerciseId, content, existingAnswer, readonly }: McqExerciseProps) {
  const router = useRouter()
  const parsedAnswers: number[] = existingAnswer ? JSON.parse(existingAnswer) : []
  const [selected, setSelected] = useState<number[]>(parsedAnswers)
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
    router.refresh()
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
                className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                  selected[qi] === oi
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
        <p className="text-sm text-green-600 dark:text-green-400 font-medium">✓ Submitted — waiting for grading</p>
      )}
    </div>
  )
}
```

### components/exercise-types/FillBlankExercise.tsx

```tsx
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

export function FillBlankExercise({ exerciseId, content, existingAnswer, readonly }: FillBlankExerciseProps) {
  const router = useRouter()
  const blankCount = (content.template.match(/___/g) ?? []).length
  const parsedAnswers: string[] = existingAnswer ? JSON.parse(existingAnswer) : Array(blankCount).fill("")
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
                onChange={e => {
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
          disabled={submitting || answers.some(a => !a.trim())}
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
```

### components/exercise-types/ShortAnswerExercise.tsx

```tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { ShortAnswerContent } from "@/lib/types"

interface ShortAnswerExerciseProps {
  exerciseId: string
  content: ShortAnswerContent
  existingAnswer: string | null
  readonly: boolean
}

export function ShortAnswerExercise({ exerciseId, content, existingAnswer, readonly }: ShortAnswerExerciseProps) {
  const router = useRouter()
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
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-700 dark:text-gray-300">{content.prompt}</p>
      <textarea
        value={answer}
        onChange={e => setAnswer(e.target.value)}
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
```

### components/exercise-types/AudioRecorderExercise.tsx (shell)

```tsx
"use client"
// NOTE: Shell component — AGENT-AUDIO completes the implementation
import type { AudioRecordingContent } from "@/lib/types"

interface AudioRecorderExerciseProps {
  exerciseId: string
  studentId: string
  content: AudioRecordingContent
  existingAudioUrl: string | null
  readonly: boolean
}

export function AudioRecorderExercise({ content, existingAudioUrl }: AudioRecorderExerciseProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-700 dark:text-gray-300">{content.prompt}</p>
      {/* TODO: AGENT-AUDIO implements recording UI here */}
      <div className="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 p-8 text-center">
        <p className="text-sm text-gray-500">Audio recorder — coming in Wave 3</p>
      </div>
      {existingAudioUrl && (
        <audio controls src={existingAudioUrl} className="w-full" />
      )}
    </div>
  )
}
```

---

## UI Utility Components

### components/ui/ExerciseBadge.tsx

```tsx
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
      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium", typeColors[type], className)}>
        {typeLabels[type]}
      </span>
    )
  }
  if (status) {
    return (
      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium", statusColors[status], className)}>
        {status}
      </span>
    )
  }
  return null
}
```

### components/ui/DueDateCountdown.tsx

```tsx
"use client"

import { useEffect, useState } from "react"

interface DueDateCountdownProps {
  dueDate: Date
}

export function DueDateCountdown({ dueDate }: DueDateCountdownProps) {
  const [label, setLabel] = useState("")

  useEffect(() => {
    const diff = new Date(dueDate).getTime() - Date.now()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

    if (days < 0) setLabel("Overdue")
    else if (days === 0) setLabel("Due today")
    else if (days === 1) setLabel("Due tomorrow")
    else setLabel(`Due in ${days}d`)
  }, [dueDate])

  const isOverdue = new Date(dueDate) < new Date()
  return (
    <span className={`text-xs ${isOverdue ? "text-red-500" : "text-gray-400 dark:text-gray-500"}`}>
      {label}
    </span>
  )
}
```

---

## loading.tsx and error.tsx

Create these in `app/(dashboard)/student/`:

**loading.tsx:**
```tsx
export default function Loading() {
  return (
    <div className="animate-pulse space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-16 bg-gray-200 dark:bg-gray-800 rounded-xl" />
      ))}
    </div>
  )
}
```

**error.tsx:**
```tsx
"use client"
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="text-center py-16">
      <p className="text-sm text-gray-500 mb-4">Something went wrong.</p>
      <button onClick={reset} className="text-sm text-blue-600 hover:underline">Try again</button>
    </div>
  )
}
```

---

## Completion Checklist

- [ ] Dashboard layout renders with sidebar and sign-out
- [ ] Student dashboard shows pending and graded exercises
- [ ] MCQ, Fill Blank, Short Answer components submit correctly
- [ ] Audio shell renders (AGENT-AUDIO will complete it)
- [ ] ExerciseBadge and DueDateCountdown components work
- [ ] loading.tsx and error.tsx in place
- [ ] `npx tsc --noEmit` passes

## Handoff Summary
```
AGENT: AGENT-STUDENT
STATUS: COMPLETE
FILES_CREATED: app/(dashboard)/layout.tsx, app/(dashboard)/student/page.tsx,
               app/(dashboard)/student/exercises/[id]/page.tsx,
               app/(dashboard)/student/loading.tsx, app/(dashboard)/student/error.tsx,
               components/exercise-types/McqExercise.tsx,
               components/exercise-types/FillBlankExercise.tsx,
               components/exercise-types/ShortAnswerExercise.tsx,
               components/exercise-types/AudioRecorderExercise.tsx (shell),
               components/ui/ExerciseBadge.tsx, components/ui/DueDateCountdown.tsx
EXPORTS: AudioRecorderExercise shell — props: exerciseId, studentId, content, existingAudioUrl, readonly
NOTES: AudioRecorderExercise is a shell. AGENT-AUDIO must implement it fully.
       Dashboard layout is shared between teacher and student via the same file.
```
