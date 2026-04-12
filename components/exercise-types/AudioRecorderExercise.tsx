"use client"

import { useState, useRef, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useAudioRecorder } from "@/hooks/useAudioRecorder"
import { uploadAudio, transcodeToWav, formatDuration } from "@/lib/audio-upload"
import type { AudioRecordingContent } from "@/lib/types"
import { useTranslations } from "next-intl"

interface AudioRecorderExerciseProps {
  exerciseId: string
  studentId: string
  content: AudioRecordingContent
  existingAudioUrl: string | null
  readonly: boolean
}

export function AudioRecorderExercise({
  exerciseId,
  studentId,
  content,
  existingAudioUrl,
  readonly,
}: AudioRecorderExerciseProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const t = useTranslations("student.exercise")
  const { state, durationSec, audioBlob, audioUrl, startRecording, stopRecording, reset, error } =
    useAudioRecorder(content.maxDurationSec)

  const [uploading, setUploading] = useState(false)
  const [submitted, setSubmitted] = useState(!!existingAudioUrl)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileAudioUrl, setFileAudioUrl] = useState<string | null>(null)
  const [fileBlob, setFileBlob] = useState<Blob | null>(null)

  const activeBlob = fileBlob ?? audioBlob
  const activeAudioUrl = fileAudioUrl ?? audioUrl

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 20 * 1024 * 1024) {
      setUploadError(t("fileTooLarge"))
      return
    }
    setFileBlob(file)
    setFileAudioUrl(URL.createObjectURL(file))
  }

  async function handleSubmit() {
    if (!activeBlob) return
    setUploading(true)
    setUploadError(null)
    try {
      let blobToUpload = activeBlob
      if (activeBlob.type.includes("webm") || activeBlob.type.includes("ogg")) {
        try {
          blobToUpload = await transcodeToWav(activeBlob)
        } catch {
          // fall back to original blob if transcoding fails
        }
      }
      const { publicUrl } = await uploadAudio(blobToUpload, exerciseId, studentId)
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseId,
          audioUrl: publicUrl,
          audioDurationSec: Math.max(1, durationSec || Math.round(activeBlob.size / 16000)),
        }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json?.error ? JSON.stringify(json.error) : `Server error ${res.status}`)
      }
      setSubmitted(true)
      startTransition(() => router.refresh())
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : t("uploadFailed"))
    } finally {
      setUploading(false)
    }
  }

  if (readonly || submitted) {
    const playUrl = existingAudioUrl ?? activeAudioUrl
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-700 dark:text-gray-300">{content.prompt}</p>
        {playUrl && <audio controls src={playUrl} className="w-full" />}
        {submitted && !readonly && (
          <p className="text-sm text-green-600 dark:text-green-400 font-medium">{t("submitted")}</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-700 dark:text-gray-300">{content.prompt}</p>
      <p className="text-xs text-gray-400">{t("maxDuration")} {formatDuration(content.maxDurationSec)}</p>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Recording controls */}
      <div className="flex items-center gap-3">
        {state === "idle" && !activeAudioUrl && (
          <button
            onClick={startRecording}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-white" />
            {t("startRecording")}
          </button>
        )}

        {state === "recording" && (
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 dark:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <span className="w-2.5 h-2.5 bg-white" />
            {t("stop")} — {formatDuration(durationSec)}
          </button>
        )}

        {state === "stopped" && activeAudioUrl && (
          <button
            onClick={reset}
            className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline"
          >
            {t("reRecord")}
          </button>
        )}
      </div>

      {/* Preview recorded audio */}
      {activeAudioUrl && state !== "recording" && (
        <audio controls src={activeAudioUrl} className="w-full" />
      )}

      {/* File upload alternative */}
      {content.allowUpload && !activeAudioUrl && state === "idle" && (
        <div>
          <p className="text-xs text-gray-400 mb-2">{t("orUpload")}</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            className="block text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-pink-100 file:text-pink-700 hover:file:bg-pink-200 dark:file:bg-gray-800 dark:file:text-gray-300"
          />
        </div>
      )}

      {/* Submit button */}
      {activeAudioUrl && state !== "recording" && (
        <button
          onClick={handleSubmit}
          disabled={uploading}
          className="px-4 py-2.5 bg-pink-500 hover:bg-pink-600 active:scale-95 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? t("uploading") : t("submit")}
        </button>
      )}

      {uploadError && <p className="text-sm text-red-500">{uploadError}</p>}
    </div>
  )
}
