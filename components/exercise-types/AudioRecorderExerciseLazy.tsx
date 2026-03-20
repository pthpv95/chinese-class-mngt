"use client"

import dynamic from "next/dynamic"

export const AudioRecorderExerciseLazy = dynamic(
  () => import("./AudioRecorderExercise").then((m) => m.AudioRecorderExercise),
  { ssr: false, loading: () => <div className="h-32 animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg" /> }
)
