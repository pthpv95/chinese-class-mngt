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

type RecordRTCAudioMime = "audio/webm;codecs=pcm" | "audio/webm" | "audio/ogg" | "audio/wav"

function getSupportedMimeType(): RecordRTCAudioMime {
  if (typeof MediaRecorder === "undefined") return "audio/wav"
  const candidates: RecordRTCAudioMime[] = [
    "audio/webm;codecs=pcm",
    "audio/webm",
    "audio/ogg",
  ]
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  // Safari: none of the above are supported; fall back to WAV (RecordRTC StereoAudioRecorder)
  return "audio/wav"
}

interface RecordRTCInstance {
  startRecording: () => void
  stopRecording: (callback: () => void) => void
  getBlob: () => Blob
}

export function useAudioRecorder(maxDurationSec = 120): AudioRecorderResult {
  const [state, setState] = useState<RecordingState>("idle")
  const [durationSec, setDurationSec] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const recorderRef = useRef<RecordRTCInstance | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)

  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (!recorderRef.current) return

    recorderRef.current.stopRecording(() => {
      const blob = recorderRef.current?.getBlob()
      if (blob) {
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
      }
      streamRef.current?.getTracks().forEach((t) => t.stop())
      setState("stopped")
    })
  }, [])

  const startRecording = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const RecordRTC = (await import("recordrtc")).default
      const recorder = new RecordRTC(stream, {
        type: "audio",
        mimeType: getSupportedMimeType(),
        timeSlice: 1000,
      })

      recorder.startRecording()
      recorderRef.current = recorder as unknown as RecordRTCInstance
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
  }, [maxDurationSec, stopRecording])

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
