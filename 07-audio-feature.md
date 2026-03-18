# instructions/07-audio-feature.md
# AGENT-AUDIO — Audio Recording & Playback

## Objective
Complete the AudioRecorderExercise component (student side) with RecordRTC
browser recording + file upload fallback. Complete the SubmissionReviewer
audio section with Wavesurfer.js waveform playback.

---

## Step 1 — hooks/useAudioRecorder.ts

```ts
"use client"

import { useState, useRef, useCallback } from "react"

type RecordingState = "idle" | "recording" | "stopped"

export interface AudioRecorderResult {
  state: RecordingState
  durationSec: number
  audioBlob: Blob | null
  audioUrl: string | null
  startRecording: () => Promise<void>
  stopRecording: () => void
  reset: () => void
  error: string | null
}

export function useAudioRecorder(maxDurationSec = 120): AudioRecorderResult {
  const [state, setState] = useState<RecordingState>("idle")
  const [durationSec, setDurationSec] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const recorderRef = useRef<import("recordrtc") | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)

  const startRecording = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const RecordRTC = (await import("recordrtc")).default
      const recorder = new RecordRTC(stream, {
        type: "audio",
        mimeType: "audio/webm;codecs=opus",
        timeSlice: 1000,
      })

      recorder.startRecording()
      recorderRef.current = recorder
      startTimeRef.current = Date.now()
      setState("recording")
      setDurationSec(0)

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
        setDurationSec(elapsed)
        if (elapsed >= maxDurationSec) {
          stopRecording()
        }
      }, 1000)
    } catch (err) {
      setError("Microphone access denied. Please allow microphone access.")
      console.error("[useAudioRecorder] start:", err)
    }
  }, [maxDurationSec])

  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (!recorderRef.current) return

    recorderRef.current.stopRecording(() => {
      const blob = recorderRef.current?.getBlob()
      if (blob) {
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
      }
      streamRef.current?.getTracks().forEach(t => t.stop())
      setState("stopped")
    })
  }, [])

  const reset = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioBlob(null)
    setAudioUrl(null)
    setDurationSec(0)
    setState("idle")
    recorderRef.current = null
  }, [audioUrl])

  return { state, durationSec, audioBlob, audioUrl, startRecording, stopRecording, reset, error }
}
```

---

## Step 2 — hooks/useAudioPlayer.ts

```ts
"use client"

import { useEffect, useRef, useState } from "react"

export function useAudioPlayer(containerRef: React.RefObject<HTMLDivElement>, audioUrl: string | null) {
  const wavesurferRef = useRef<import("wavesurfer.js").default | null>(null)
  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!containerRef.current || !audioUrl) return

    let ws: import("wavesurfer.js").default

    async function init() {
      const WaveSurfer = (await import("wavesurfer.js")).default
      ws = WaveSurfer.create({
        container: containerRef.current!,
        waveColor: "#93c5fd",
        progressColor: "#2563eb",
        cursorColor: "#1d4ed8",
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        height: 60,
        normalize: true,
      })

      ws.load(audioUrl)
      ws.on("ready", () => { setDuration(ws.getDuration()); setReady(true) })
      ws.on("audioprocess", () => setCurrentTime(ws.getCurrentTime()))
      ws.on("play", () => setPlaying(true))
      ws.on("pause", () => setPlaying(false))
      ws.on("finish", () => setPlaying(false))
      wavesurferRef.current = ws
    }

    void init()
    return () => { ws?.destroy(); wavesurferRef.current = null; setReady(false) }
  }, [audioUrl, containerRef])

  function togglePlay() { wavesurferRef.current?.playPause() }
  function seek(pct: number) { wavesurferRef.current?.seekTo(pct) }

  return { playing, duration, currentTime, ready, togglePlay, seek }
}
```

---

## Step 3 — lib/audio-upload.ts

```ts
export interface UploadAudioResult {
  publicUrl: string
  filePath: string
}

export async function uploadAudioToSupabase(
  blob: Blob,
  exerciseId: string,
  studentId: string
): Promise<UploadAudioResult> {
  // Step 1: Get signed upload URL from our API
  const mimeType = blob.type || "audio/webm"
  const res = await fetch("/api/upload/audio", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      exerciseId,
      studentId,
      mimeType,
      fileSizeBytes: blob.size,
    }),
  })

  if (!res.ok) {
    const json = await res.json() as { error?: string }
    throw new Error(json.error ?? "Failed to get upload URL")
  }

  const { data } = await res.json() as {
    data: { signedUrl: string; token: string; filePath: string }
  }

  // Step 2: Upload directly to Supabase (bypasses Next.js server)
  const uploadRes = await fetch(data.signedUrl, {
    method: "PUT",
    headers: { "Content-Type": mimeType },
    body: blob,
  })

  if (!uploadRes.ok) throw new Error("Audio upload to storage failed")

  return {
    filePath: data.filePath,
    publicUrl: data.signedUrl.split("?")[0] ?? data.filePath, // strip query params
  }
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}
```

---

## Step 4 — Complete AudioRecorderExercise.tsx

Replace the shell from AGENT-STUDENT with:

```tsx
"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAudioRecorder } from "@/hooks/useAudioRecorder"
import { uploadAudioToSupabase, formatDuration } from "@/lib/audio-upload"
import type { AudioRecordingContent } from "@/lib/types"

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
    if (file.size > 20 * 1024 * 1024) { setUploadError("File too large. Max 20MB."); return }
    setFileBlob(file)
    setFileAudioUrl(URL.createObjectURL(file))
  }

  async function handleSubmit() {
    if (!activeBlob) return
    setUploading(true)
    setUploadError(null)
    try {
      const { publicUrl } = await uploadAudioToSupabase(activeBlob, exerciseId, studentId)
      await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseId,
          audioUrl: publicUrl,
          audioDurationSec: durationSec || Math.round(activeBlob.size / 16000),
        }),
      })
      setSubmitted(true)
      router.refresh()
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed")
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
          <p className="text-sm text-green-600 dark:text-green-400 font-medium">✓ Submitted</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-700 dark:text-gray-300">{content.prompt}</p>
      <p className="text-xs text-gray-400">Max duration: {formatDuration(content.maxDurationSec)}</p>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Recording controls */}
      <div className="flex items-center gap-3">
        {state === "idle" && !activeAudioUrl && (
          <button
            onClick={startRecording}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-white" />
            Start recording
          </button>
        )}

        {state === "recording" && (
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 dark:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <span className="w-2.5 h-2.5 bg-white" />
            Stop — {formatDuration(durationSec)}
          </button>
        )}

        {state === "stopped" && activeAudioUrl && (
          <button
            onClick={reset}
            className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline"
          >
            Re-record
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
          <p className="text-xs text-gray-400 mb-2">Or upload a recording:</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            className="block text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 dark:file:bg-gray-800 dark:file:text-gray-300"
          />
        </div>
      )}

      {/* Submit button */}
      {activeAudioUrl && state !== "recording" && (
        <button
          onClick={handleSubmit}
          disabled={uploading}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          {uploading ? "Uploading..." : "Submit recording"}
        </button>
      )}

      {uploadError && <p className="text-sm text-red-500">{uploadError}</p>}
    </div>
  )
}
```

---

## Step 5 — Complete SubmissionReviewer Audio Section

Replace the `// TODO` section in `components/teacher/SubmissionReviewer.tsx` with the Wavesurfer player. Find this block:

```tsx
{exerciseType === "AUDIO_RECORDING" && audioUrl ? (
  // TODO: AGENT-AUDIO replaces this with Wavesurfer player
  <audio controls src={audioUrl} className="w-full" />
) :
```

Replace with:

```tsx
{exerciseType === "AUDIO_RECORDING" && audioUrl ? (
  <AudioPlayer audioUrl={audioUrl} durationSec={audioDurationSec} />
) :
```

Then add this component at the bottom of the file (still inside the same file):

```tsx
"use client"
import { useRef } from "react"
import { useAudioPlayer } from "@/hooks/useAudioPlayer"
import { formatDuration } from "@/lib/audio-upload"

function AudioPlayer({ audioUrl, durationSec }: { audioUrl: string; durationSec: number | null }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { playing, duration, currentTime, ready, togglePlay } = useAudioPlayer(containerRef, audioUrl)

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
          className="w-9 h-9 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition-colors"
        >
          {playing ? (
            <span className="flex gap-0.5"><span className="w-1 h-4 bg-white rounded" /><span className="w-1 h-4 bg-white rounded" /></span>
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
```

---

## Step 6 — Supabase Storage Policy

Create `supabase/storage-policies.sql`:

```sql
-- Audio bucket: students upload their own audio, teachers can read all
CREATE POLICY "Students upload own audio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'audio' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Students read own audio"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'audio' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Service role (used server-side) bypasses RLS automatically
```

---

## Step 7 — Supabase Storage Signed Playback URL Helper

Add to `lib/audio-upload.ts`:

```ts
export async function getAudioPlaybackUrl(filePath: string): Promise<string | null> {
  const { createSupabaseServerClient } = await import("@/lib/supabase")
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase.storage
    .from("audio")
    .createSignedUrl(filePath, 3600) // 1 hour expiry
  if (error) return null
  return data.signedUrl
}
```

---

## Completion Checklist

- [ ] `useAudioRecorder` hook works — start, stop, reset
- [ ] `useAudioPlayer` hook renders Wavesurfer waveform
- [ ] `AudioRecorderExercise` records + uploads + submits
- [ ] File upload fallback works (accepts audio/*)
- [ ] 20MB file size limit enforced client and server side
- [ ] SubmissionReviewer shows Wavesurfer player with play/pause
- [ ] `supabase/storage-policies.sql` created
- [ ] `npx tsc --noEmit` passes

## Handoff Summary
```
AGENT: AGENT-AUDIO
STATUS: COMPLETE
FILES_CREATED: hooks/useAudioRecorder.ts, hooks/useAudioPlayer.ts,
               lib/audio-upload.ts, supabase/storage-policies.sql
FILES_MODIFIED: components/exercise-types/AudioRecorderExercise.tsx (full implementation),
                components/teacher/SubmissionReviewer.tsx (replaced audio section)
EXPORTS: useAudioRecorder, useAudioPlayer hooks; uploadAudioToSupabase, getAudioPlaybackUrl from lib/audio-upload.ts
NOTES: Wavesurfer loads asynchronously (dynamic import). RecordRTC also dynamic import.
       Both handle SSR correctly since components are "use client".
```
