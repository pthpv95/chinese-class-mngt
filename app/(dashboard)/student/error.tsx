"use client"

import type { ErrorInfo } from "next/error"

export default function Error({ error, unstable_retry }: ErrorInfo) {
  return (
    <div className="text-center py-16">
      <p className="text-sm text-gray-500 mb-4">{error.message || "Something went wrong."}</p>
      <button onClick={unstable_retry} className="text-sm text-blue-600 hover:underline">
        Try again
      </button>
    </div>
  )
}
