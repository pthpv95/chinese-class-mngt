"use client"

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="text-center py-16">
      <p className="text-sm text-gray-500 mb-4">Something went wrong.</p>
      <button onClick={reset} className="text-sm text-blue-600 hover:underline">
        Try again
      </button>
    </div>
  )
}
