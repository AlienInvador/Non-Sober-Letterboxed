'use client'
import { useState } from 'react'

export function InviteLink({ username }: { username: string }) {
  const [copied, setCopied] = useState(false)
  const url = `${typeof window === 'undefined' ? '' : location.origin}/u/${username}?add=1`
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      // clipboard blocked: the link stays visible to copy by hand
    }
  }
  return (
    <div className="flex flex-col items-center gap-2">
      <code suppressHydrationWarning className="font-mono text-sm text-body">{url}</code>
      <button type="button" onClick={copy} className="rounded-full bg-raised px-4 py-1.5 text-sm text-text">
        {copied ? 'Copied' : 'Copy invite link'}
      </button>
    </div>
  )
}
