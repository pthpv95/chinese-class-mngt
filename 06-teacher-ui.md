# instructions/06-teacher-ui.md
# AGENT-TEACHER — Teacher UI

## Objective
Build all teacher-facing pages: class management, exercise builder with all types,
and submission review with grading. Use the shared dashboard layout from AGENT-STUDENT.

---

## Teacher Dashboard

### app/(dashboard)/teacher/page.tsx

```tsx
import { requireTeacher } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import Link from "next/link"

export const metadata = { title: "Teacher Dashboard — EduFlow" }

export default async function TeacherDashboard() {
  const session = await requireTeacher()

  const classes = await prisma.class.findMany({
    where: { teacherId: session.user.id },
    include: {
      _count: { select: { enrollments: true, exercises: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const pendingGrading = await prisma.submission.count({
    where: {
      status: "SUBMITTED",
      exercise: { createdById: session.user.id },
    },
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">My classes</h2>
        <div className="flex gap-3">
          {pendingGrading > 0 && (
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              {pendingGrading} to grade
            </span>
          )}
          <CreateClassButton />
        </div>
      </div>

      {classes.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
          <p className="text-sm text-gray-500 mb-3">No classes yet. Create your first one.</p>
          <CreateClassButton />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {classes.map(cls => (
          <Link
            key={cls.id}
            href={`/teacher/classes/${cls.id}`}
            className="p-5 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-medium text-gray-900 dark:text-white">{cls.name}</h3>
              <span className="text-xs font-mono text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                {cls.code}
              </span>
            </div>
            <div className="flex gap-4 text-xs text-gray-500">
              <span>{cls._count.enrollments} students</span>
              <span>{cls._count.exercises} exercises</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function CreateClassButton() {
  // Server action inline
  async function createClass(formData: FormData) {
    "use server"
    const { requireTeacher } = await import("@/lib/auth-helpers")
    const { prisma } = await import("@/lib/prisma")
    const session = await requireTeacher()
    const name = formData.get("name") as string
    if (!name?.trim()) return
    await prisma.class.create({ data: { name: name.trim(), teacherId: session.user.id } })
    const { revalidatePath } = await import("next/cache")
    revalidatePath("/teacher")
  }

  return (
    <form action={createClass} className="flex gap-2">
      <input
        name="name"
        type="text"
        placeholder="Class name"
        required
        className="w-36 text-sm px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button type="submit" className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
        Create
      </button>
    </form>
  )
}
```

---

## Class Detail Page

### app/(dashboard)/teacher/classes/[id]/page.tsx

```tsx
import { requireTeacher } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ExerciseBadge } from "@/components/ui/ExerciseBadge"
import { formatDate } from "@/lib/utils"
import type { ExerciseType, SubmissionStatus } from "@/lib/types"

export default async function ClassDetailPage({ params }: { params: { id: string } }) {
  const session = await requireTeacher()

  const cls = await prisma.class.findFirst({
    where: { id: params.id, teacherId: session.user.id },
    include: {
      enrollments: {
        include: { student: { select: { id: true, name: true, email: true } } },
      },
      exercises: {
        include: { _count: { select: { submissions: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  })

  if (!cls) notFound()

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{cls.name}</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Invite code: <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-900 dark:text-white">{cls.code}</span>
          </p>
        </div>
        <Link
          href={`/teacher/exercises/new?classId=${cls.id}`}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + New exercise
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Exercises */}
        <div className="md:col-span-2 space-y-3">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Exercises</h3>
          {cls.exercises.length === 0 && (
            <p className="text-sm text-gray-400 py-4">No exercises yet.</p>
          )}
          {cls.exercises.map(ex => (
            <div key={ex.id} className="p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <ExerciseBadge type={ex.type as ExerciseType} />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{ex.title}</span>
                  {!ex.published && (
                    <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">Draft</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{ex._count.submissions} submitted</span>
                  <Link
                    href={`/teacher/submissions?exerciseId=${ex.id}`}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    View →
                  </Link>
                </div>
              </div>
              {ex.dueDate && (
                <p className="text-xs text-gray-400 mt-1 ml-0">Due: {formatDate(ex.dueDate)}</p>
              )}
            </div>
          ))}
        </div>

        {/* Students */}
        <div>
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
            Students ({cls.enrollments.length})
          </h3>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
            {cls.enrollments.length === 0 && (
              <p className="text-sm text-gray-400 px-4 py-4">No students enrolled yet. Share the invite code.</p>
            )}
            {cls.enrollments.map(e => (
              <div key={e.id} className="px-4 py-3">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{e.student.name}</p>
                <p className="text-xs text-gray-500">{e.student.email}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
```

---

## Exercise Builder

### app/(dashboard)/teacher/exercises/new/page.tsx

```tsx
import { requireTeacher } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { ExerciseBuilder } from "@/components/teacher/ExerciseBuilder"

export const metadata = { title: "New Exercise — EduFlow" }

export default async function NewExercisePage({
  searchParams,
}: {
  searchParams: { classId?: string }
}) {
  const session = await requireTeacher()

  const classes = await prisma.class.findMany({
    where: { teacherId: session.user.id },
    select: { id: true, name: true },
  })

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">New exercise</h2>
      <ExerciseBuilder classes={classes} defaultClassId={searchParams.classId} />
    </div>
  )
}
```

### components/teacher/ExerciseBuilder.tsx

```tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { ExerciseType } from "@/lib/types"

interface ExerciseBuilderProps {
  classes: Array<{ id: string; name: string }>
  defaultClassId?: string
}

const baseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  classId: z.string().min(1, "Select a class"),
  type: z.enum(["MCQ", "FILL_BLANK", "SHORT_ANSWER", "AUDIO_RECORDING", "FILE_UPLOAD"]),
  dueDate: z.string().optional(),
  published: z.boolean().default(false),
})

type BaseForm = z.infer<typeof baseSchema>

export function ExerciseBuilder({ classes, defaultClassId }: ExerciseBuilderProps) {
  const router = useRouter()
  const [selectedType, setSelectedType] = useState<ExerciseType>("MCQ")
  const [content, setContent] = useState<Record<string, unknown>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<BaseForm>({
    resolver: zodResolver(baseSchema),
    defaultValues: { classId: defaultClassId, type: "MCQ", published: false },
  })

  const typeOptions: Array<{ value: ExerciseType; label: string }> = [
    { value: "MCQ", label: "Multiple choice" },
    { value: "FILL_BLANK", label: "Fill in the blanks" },
    { value: "SHORT_ANSWER", label: "Short answer" },
    { value: "AUDIO_RECORDING", label: "Audio recording" },
  ]

  async function onSubmit(data: BaseForm) {
    setSubmitting(true)
    setError(null)
    const res = await fetch("/api/exercises", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, content }),
    })
    const json = await res.json() as { error?: string; data?: { id: string } }
    if (!res.ok) { setError(json.error ?? "Failed to create"); setSubmitting(false); return }
    router.push(`/teacher/classes/${data.classId}`)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic fields */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Title</label>
          <input {...register("title")} className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Vocabulary Quiz — Chapter 3" />
          {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Class</label>
            <select {...register("classId")} className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {errors.classId && <p className="mt-1 text-xs text-red-500">{errors.classId.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Due date</label>
            <input {...register("dueDate")} type="datetime-local" className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Exercise type</label>
          <div className="flex flex-wrap gap-2">
            {typeOptions.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { setSelectedType(opt.value); setContent({}) }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${selectedType === opt.value ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <input type="hidden" {...register("type")} value={selectedType} />
        </div>
      </div>

      {/* Dynamic content form */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Exercise content</h3>
        {selectedType === "MCQ" && <McqBuilder onChange={setContent} />}
        {selectedType === "FILL_BLANK" && <FillBlankBuilder onChange={setContent} />}
        {selectedType === "SHORT_ANSWER" && <ShortAnswerBuilder onChange={setContent} />}
        {selectedType === "AUDIO_RECORDING" && <AudioBuilder onChange={setContent} />}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex items-center gap-4">
        <button type="submit" name="published" value="true" disabled={submitting}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
          {submitting ? "Saving..." : "Publish exercise"}
        </button>
        <button type="submit" disabled={submitting}
          className="px-5 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium rounded-lg transition-colors">
          Save as draft
        </button>
      </div>
    </form>
  )
}

// --- Sub-builders ---

function McqBuilder({ onChange }: { onChange: (c: Record<string, unknown>) => void }) {
  const [questions, setQuestions] = useState([{ text: "", options: ["", "", "", ""], answer: 0 }])

  function update(updated: typeof questions) {
    setQuestions(updated)
    onChange({ questions: updated })
  }

  return (
    <div className="space-y-6">
      {questions.map((q, qi) => (
        <div key={qi} className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">Q{qi + 1}</span>
            <input
              value={q.text}
              onChange={e => update(questions.map((x, i) => i === qi ? { ...x, text: e.target.value } : x))}
              className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Question text"
            />
          </div>
          {q.options.map((opt, oi) => (
            <div key={oi} className="flex items-center gap-2 ml-6">
              <input
                type="radio"
                name={`correct-${qi}`}
                checked={q.answer === oi}
                onChange={() => update(questions.map((x, i) => i === qi ? { ...x, answer: oi } : x))}
                className="accent-blue-600"
              />
              <input
                value={opt}
                onChange={e => {
                  const opts = [...q.options]; opts[oi] = e.target.value
                  update(questions.map((x, i) => i === qi ? { ...x, options: opts } : x))
                }}
                className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Option ${oi + 1}`}
              />
            </div>
          ))}
        </div>
      ))}
      <button type="button" onClick={() => update([...questions, { text: "", options: ["", "", "", ""], answer: 0 }])}
        className="text-sm text-blue-600 hover:underline">+ Add question</button>
    </div>
  )
}

function FillBlankBuilder({ onChange }: { onChange: (c: Record<string, unknown>) => void }) {
  const [template, setTemplate] = useState("")
  const [answers, setAnswers] = useState<string[]>([])

  function handleTemplate(v: string) {
    setTemplate(v)
    const count = (v.match(/___/g) ?? []).length
    setAnswers(Array(count).fill(""))
    onChange({ template: v, answers: Array(count).fill("") })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1.5">Sentence (use ___ for blanks)</label>
        <textarea value={template} onChange={e => handleTemplate(e.target.value)} rows={3}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="She ___ to school every day. They ___ football now." />
      </div>
      {answers.map((ans, i) => (
        <div key={i}>
          <label className="text-xs text-gray-500">Blank {i + 1} answer</label>
          <input value={ans} onChange={e => {
            const next = [...answers]; next[i] = e.target.value
            setAnswers(next); onChange({ template, answers: next })
          }} className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Correct answer" />
        </div>
      ))}
    </div>
  )
}

function ShortAnswerBuilder({ onChange }: { onChange: (c: Record<string, unknown>) => void }) {
  const [prompt, setPrompt] = useState("")
  const [sample, setSample] = useState("")
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1.5">Prompt / question</label>
        <textarea value={prompt} onChange={e => { setPrompt(e.target.value); onChange({ prompt: e.target.value, sampleAnswer: sample }) }} rows={3}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Describe what students should write about..." />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1.5">Sample answer (optional, only visible to you)</label>
        <textarea value={sample} onChange={e => { setSample(e.target.value); onChange({ prompt, sampleAnswer: e.target.value }) }} rows={2}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Model answer for your reference..." />
      </div>
    </div>
  )
}

function AudioBuilder({ onChange }: { onChange: (c: Record<string, unknown>) => void }) {
  const [prompt, setPrompt] = useState("")
  const [maxDuration, setMaxDuration] = useState(60)
  const [allowUpload, setAllowUpload] = useState(true)

  function update(p = prompt, d = maxDuration, u = allowUpload) {
    onChange({ prompt: p, maxDurationSec: d, allowUpload: u })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1.5">Instructions for students</label>
        <textarea value={prompt} onChange={e => { setPrompt(e.target.value); update(e.target.value) }} rows={3}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Please record yourself saying the following..." />
      </div>
      <div className="flex items-center gap-6">
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1.5">Max duration (seconds)</label>
          <input type="number" value={maxDuration} onChange={e => { setMaxDuration(Number(e.target.value)); update(prompt, Number(e.target.value)) }} min={10} max={300}
            className="w-24 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex items-center gap-2 mt-4">
          <input type="checkbox" id="allowUpload" checked={allowUpload} onChange={e => { setAllowUpload(e.target.checked); update(prompt, maxDuration, e.target.checked) }} className="accent-blue-600" />
          <label htmlFor="allowUpload" className="text-sm text-gray-700 dark:text-gray-300">Allow file upload</label>
        </div>
      </div>
    </div>
  )
}
```

---

## Submission Review Page

### app/(dashboard)/teacher/submissions/[id]/page.tsx

```tsx
import { requireTeacher } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { SubmissionReviewer } from "@/components/teacher/SubmissionReviewer"
import type { ExerciseType } from "@/lib/types"

export default async function SubmissionReviewPage({ params }: { params: { id: string } }) {
  const session = await requireTeacher()

  const submission = await prisma.submission.findUnique({
    where: { id: params.id },
    include: {
      student: { select: { id: true, name: true, email: true } },
      exercise: {
        select: { id: true, title: true, type: true, content: true, createdById: true },
      },
    },
  })

  if (!submission || submission.exercise.createdById !== session.user.id) notFound()

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <p className="text-xs text-gray-500">{submission.exercise.title}</p>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-0.5">
          {submission.student.name}&apos;s submission
        </h2>
      </div>
      <SubmissionReviewer
        submissionId={submission.id}
        exerciseType={submission.exercise.type as ExerciseType}
        textAnswer={submission.textAnswer}
        audioUrl={submission.audioUrl}
        audioDurationSec={submission.audioDurationSec}
        content={submission.exercise.content as Record<string, unknown>}
        currentScore={submission.score}
        currentComment={submission.teacherComment}
        status={submission.status as "SUBMITTED" | "GRADED"}
      />
    </div>
  )
}
```

### components/teacher/SubmissionReviewer.tsx (shell — AGENT-AUDIO completes audio part)

```tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { ExerciseType, SubmissionStatus } from "@/lib/types"

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
  content,
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
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Student answer</h3>

        {exerciseType === "AUDIO_RECORDING" && audioUrl ? (
          // TODO: AGENT-AUDIO replaces this with Wavesurfer player
          <audio controls src={audioUrl} className="w-full" />
        ) : textAnswer ? (
          <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{textAnswer}</p>
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
            onChange={e => setScore(Number(e.target.value))}
            className="w-24 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1.5">Comment for student</label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Great effort! Consider..."
          />
        </div>

        <button
          onClick={handleGrade}
          disabled={submitting}
          className="px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {submitting ? "Saving..." : status === "GRADED" ? "Update grade" : "Submit grade"}
        </button>
      </div>
    </div>
  )
}
```

---

## Completion Checklist

- [ ] Teacher dashboard shows classes and pending grading count
- [ ] Class detail shows exercises and enrolled students with invite code
- [ ] Exercise builder works for all 4 types
- [ ] Publish vs draft toggle works
- [ ] Submission review page shows answer and grade form
- [ ] Grade submission saves score + comment
- [ ] `npx tsc --noEmit` passes

## Handoff Summary
```
AGENT: AGENT-TEACHER
STATUS: COMPLETE
FILES_CREATED: app/(dashboard)/teacher/page.tsx,
               app/(dashboard)/teacher/classes/[id]/page.tsx,
               app/(dashboard)/teacher/exercises/new/page.tsx,
               app/(dashboard)/teacher/submissions/[id]/page.tsx,
               components/teacher/ExerciseBuilder.tsx,
               components/teacher/SubmissionReviewer.tsx (shell)
EXPORTS: SubmissionReviewer — props: submissionId, exerciseType, textAnswer,
         audioUrl, audioDurationSec, content, currentScore, currentComment, status
NOTES: SubmissionReviewer has a TODO for AGENT-AUDIO to replace the basic
       <audio> tag with Wavesurfer waveform player.
```
