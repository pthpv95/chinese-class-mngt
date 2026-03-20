"use client"

import { useState } from "react"

export function CopyInviteLinkButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    const url = `${window.location.origin}/join/${code}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="text-xs text-pink-500 hover:text-pink-600 dark:hover:text-pink-400 font-medium transition-colors"
    >
      {copied ? "Copied!" : "Copy invite link"}
    </button>
  )
}
