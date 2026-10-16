'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteSession } from '@/actions/sessions'

// Two-step delete without window.confirm: first click arms it, second click deletes.
export function DeleteSesh({ sessionId }: { sessionId: string }) {
  const router = useRouter()
  const [armed, setArmed] = useState(false)
  const [error, setError] = useState('')
  const [pending, start] = useTransition()
  const run = () => start(async () => {
    const r = await deleteSession(sessionId)
    if (r.ok) router.refresh()
    else { setError(r.error); setArmed(false) }
  })
  return (
    <span className="inline-flex items-center gap-2">
      {armed ? (
        <>
          <button type="button" disabled={pending} onClick={run} className="h-9 rounded-full bg-drunk px-4 text-sm font-semibold text-bg">
            Delete for real?
          </button>
          <button type="button" disabled={pending} onClick={() => setArmed(false)} className="h-9 rounded-full px-3 text-sm text-muted">Cancel</button>
        </>
      ) : (
        <button type="button" onClick={() => { setError(''); setArmed(true) }} className="h-9 rounded-full px-3 text-sm text-muted underline underline-offset-2">
          Delete
        </button>
      )}
      {error && <span role="alert" className="text-sm text-muted">{error}</span>}
    </span>
  )
}
