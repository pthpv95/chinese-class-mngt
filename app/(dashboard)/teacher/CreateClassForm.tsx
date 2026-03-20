"use client"

import { useFormStatus } from "react-dom"
import { createClass } from "./actions"

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? "Creating…" : "Create"}
    </button>
  )
}

export function CreateClassForm() {
  return (
    <form action={createClass} className="flex gap-2">
      <input
        name="name"
        type="text"
        placeholder="Class name"
        required
        className="w-36 text-sm px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <SubmitButton />
    </form>
  )
}
