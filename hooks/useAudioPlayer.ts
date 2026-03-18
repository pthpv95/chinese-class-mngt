"use client"

import { useEffect, useRef, useState } from "react"
import type React from "react"

interface WaveSurferInstance {
  load: (url: string) => void
  getDuration: () => number
  getCurrentTime: () => number
  playPause: () => void
  seekTo: (progress: number) => void
  on: (event: string, callback: (...args: unknown[]) => void) => void
  destroy: () => void
}

export function useAudioPlayer(
  containerRef: React.RefObject<HTMLDivElement | null>,
  audioUrl: string | null
) {
  const wavesurferRef = useRef<WaveSurferInstance | null>(null)
  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!containerRef.current || !audioUrl) return

    let ws: WaveSurferInstance | undefined

    async function init() {
      if (!containerRef.current) return
      const WaveSurfer = (await import("wavesurfer.js")).default
      ws = WaveSurfer.create({
        container: containerRef.current,
        waveColor: "#93c5fd",
        progressColor: "#2563eb",
        cursorColor: "#1d4ed8",
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        height: 60,
        normalize: true,
      }) as unknown as WaveSurferInstance

      ws.load(audioUrl as string)
      ws.on("ready", () => {
        setDuration(ws?.getDuration() ?? 0)
        setReady(true)
      })
      ws.on("audioprocess", () => setCurrentTime(ws?.getCurrentTime() ?? 0))
      ws.on("play", () => setPlaying(true))
      ws.on("pause", () => setPlaying(false))
      ws.on("finish", () => setPlaying(false))
      wavesurferRef.current = ws
    }

    void init()
    return () => {
      ws?.destroy()
      wavesurferRef.current = null
      setReady(false)
    }
  }, [audioUrl, containerRef])

  function togglePlay() {
    wavesurferRef.current?.playPause()
  }

  function seek(pct: number) {
    wavesurferRef.current?.seekTo(pct)
  }

  return { playing, duration, currentTime, ready, togglePlay, seek }
}
