"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { ExerciseType } from "@/lib/types"

interface ExerciseBuilderProps {
  classes: Array<{ id: string; name: string }>
  defaultClassId?: string | undefined
}

const baseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  classId: z.string().min(1, "Select a class"),
  type: z.enum(["MCQ", "FILL_BLANK", "SHORT_ANSWER", "AUDIO_RECORDING", "FILE_UPLOAD"]),
  dueDate: z.string().optional(),
  published: z.boolean(),
})

type BaseForm = z.infer<typeof baseSchema>

export function ExerciseBuilder({ classes, defaultClassId }: ExerciseBuilderProps) {
  const router = useRouter()
  const [selectedType, setSelectedType] = useState<ExerciseType>("MCQ")
  const [content, setContent] = useState<Record<string, unknown>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BaseForm>({
    resolver: zodResolver(baseSchema),
    defaultValues: { classId: defaultClassId ?? "", type: "MCQ", published: false },
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
    const json = (await res.json()) as { error?: string; data?: { id: string } }
    if (!res.ok) {
      setError(typeof json.error === "string" ? json.error : "Failed to create")
      setSubmitting(false)
      return
    }
    router.push(`/teacher/classes/${data.classId}`)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic fields */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Title
          </label>
          <input
            {...register("title")}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. Vocabulary Quiz — Chapter 3"
          />
          {errors.title && (
            <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Class
            </label>
            <select
              {...register("classId")}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.classId && (
              <p className="mt-1 text-xs text-red-500">{errors.classId.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Due date
            </label>
            <input
              {...register("dueDate")}
              type="datetime-local"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Exercise type
          </label>
          <div className="flex flex-wrap gap-2">
            {typeOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setSelectedType(opt.value)
                  setContent({})
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  selectedType === opt.value
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                    : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                }`}
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
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
          Exercise content
        </h3>
        {selectedType === "MCQ" && <McqBuilder onChange={setContent} />}
        {selectedType === "FILL_BLANK" && <FillBlankBuilder onChange={setContent} />}
        {selectedType === "SHORT_ANSWER" && <ShortAnswerBuilder onChange={setContent} />}
        {selectedType === "AUDIO_RECORDING" && <AudioBuilder onChange={setContent} />}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {submitting ? "Saving..." : "Publish exercise"}
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => {
            const form = document.querySelector("form")
            if (form) {
              const hiddenPublished = form.querySelector<HTMLInputElement>(
                'input[name="published"]'
              )
              if (hiddenPublished) hiddenPublished.value = "false"
              form.requestSubmit()
            }
          }}
          className="px-5 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium rounded-lg transition-colors"
        >
          Save as draft
        </button>
      </div>
    </form>
  )
}

// --- Sub-builders ---

function McqBuilder({ onChange }: { onChange: (c: Record<string, unknown>) => void }) {
  const [questions, setQuestions] = useState([
    { text: "", options: ["", "", "", ""], answer: 0 },
  ])

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
              onChange={(e) =>
                update(questions.map((x, i) => (i === qi ? { ...x, text: e.target.value } : x)))
              }
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
                onChange={() =>
                  update(questions.map((x, i) => (i === qi ? { ...x, answer: oi } : x)))
                }
                className="accent-blue-600"
              />
              <input
                value={opt}
                onChange={(e) => {
                  const opts = [...q.options]
                  opts[oi] = e.target.value
                  update(questions.map((x, i) => (i === qi ? { ...x, options: opts } : x)))
                }}
                className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Option ${oi + 1}`}
              />
            </div>
          ))}
        </div>
      ))}
      <button
        type="button"
        onClick={() => update([...questions, { text: "", options: ["", "", "", ""], answer: 0 }])}
        className="text-sm text-blue-600 hover:underline"
      >
        + Add question
      </button>
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
        <label className="text-xs font-medium text-gray-500 block mb-1.5">
          Sentence (use ___ for blanks)
        </label>
        <textarea
          value={template}
          onChange={(e) => handleTemplate(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="She ___ to school every day. They ___ football now."
        />
      </div>
      {answers.map((ans, i) => (
        <div key={i}>
          <label className="text-xs text-gray-500">Blank {i + 1} answer</label>
          <input
            value={ans}
            onChange={(e) => {
              const next = [...answers]
              next[i] = e.target.value
              setAnswers(next)
              onChange({ template, answers: next })
            }}
            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Correct answer"
          />
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
        <textarea
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value)
            onChange({ prompt: e.target.value, sampleAnswer: sample })
          }}
          rows={3}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Describe what students should write about..."
        />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1.5">
          Sample answer (optional, only visible to you)
        </label>
        <textarea
          value={sample}
          onChange={(e) => {
            setSample(e.target.value)
            onChange({ prompt, sampleAnswer: e.target.value })
          }}
          rows={2}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Model answer for your reference..."
        />
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
        <label className="text-xs font-medium text-gray-500 block mb-1.5">
          Instructions for students
        </label>
        <textarea
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value)
            update(e.target.value)
          }}
          rows={3}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Please record yourself saying the following..."
        />
      </div>
      <div className="flex items-center gap-6">
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1.5">
            Max duration (seconds)
          </label>
          <input
            type="number"
            value={maxDuration}
            onChange={(e) => {
              setMaxDuration(Number(e.target.value))
              update(prompt, Number(e.target.value))
            }}
            min={10}
            max={300}
            className="w-24 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2 mt-4">
          <input
            type="checkbox"
            id="allowUpload"
            checked={allowUpload}
            onChange={(e) => {
              setAllowUpload(e.target.checked)
              update(prompt, maxDuration, e.target.checked)
            }}
            className="accent-blue-600"
          />
          <label htmlFor="allowUpload" className="text-sm text-gray-700 dark:text-gray-300">
            Allow file upload
          </label>
        </div>
      </div>
    </div>
  )
}
