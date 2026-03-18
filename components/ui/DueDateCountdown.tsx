"use client"

import { useEffect, useState } from "react"

interface DueDateCountdownProps {
  dueDate: Date
}

export function DueDateCountdown({ dueDate }: DueDateCountdownProps) {
  const [label, setLabel] = useState("")

  useEffect(() => {
    const diff = new Date(dueDate).getTime() - Date.now()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

    if (days < 0) setLabel("Overdue")
    else if (days === 0) setLabel("Due today")
    else if (days === 1) setLabel("Due tomorrow")
    else setLabel(`Due in ${days}d`)
  }, [dueDate])

  const isOverdue = new Date(dueDate) < new Date()
  return (
    <span className={`text-xs ${isOverdue ? "text-red-500" : "text-gray-400 dark:text-gray-500"}`}>
      {label}
    </span>
  )
}
