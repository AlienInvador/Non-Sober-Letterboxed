'use client'
import { useState } from 'react'
import { toggleCheers } from '@/actions/cheers'

export function CheersButton({ sessionId, count, cheered }: { sessionId: string; count: number; cheered: boolean }) {
  const [s, setS] = useState({ count, cheered })
  const [busy, setBusy] = useState(false)
  const click = async () => {
    if (busy) return
    const prev = s
    setBusy(true)
    setS({ cheered: !prev.cheered, count: prev.count + (prev.cheered ? -1 : 1) })
    try {
      setS(await toggleCheers(sessionId))
    } catch {
      setS(prev)
    } finally {
      setBusy(false)
    }
  }
  return (
    <button
      type="button"
      aria-label={`Cheers, ${s.count} so far`}
      aria-pressed={s.cheered}
      onClick={click}
      className={`inline-flex h-9 items-center gap-2 rounded-full bg-raised px-4 text-sm transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 focus-visible:opacity-100 ${
        s.cheered ? 'text-text opacity-100' : 'text-muted opacity-60'
      }`}
    >
      <span aria-hidden>🥂</span>
      <span aria-hidden className="font-mono">{s.count}</span>
    </button>
  )
}
