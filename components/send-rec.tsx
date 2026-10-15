'use client'
import { useEffect, useState } from 'react'
import { Dialog } from 'radix-ui'
import { InfluenceChip } from '@/components/influence-chip'
import { getLogContext, type LogContext } from '@/actions/sessions'
import { sendRec } from '@/actions/recs'
import type { Influence } from '@/lib/influence'

type RecMovie = { tmdbId: number; title: string }
type Props = { movie: RecMovie; influence?: Exclude<Influence, 'sober'>; sessionId?: string; onDone(): void }
const field = 'rounded-control bg-card px-3 py-2 text-sm text-text'

export function SendRecForm({ movie, influence: initialInfluence, sessionId, onDone }: Props) {
  const [ctx, setCtx] = useState<LogContext | null>(null)
  const [to, setTo] = useState<string[]>([])
  const [crewId, setCrewId] = useState('')
  const [influence, setInfluence] = useState<Exclude<Influence, 'sober'> | null>(initialInfluence ?? null)
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(0)

  useEffect(() => {
    getLogContext().then(setCtx).catch(() => setCtx({ friends: [], crews: [] }))
  }, [])

  const canSend = !!influence && (to.length > 0 || !!crewId) && !sending

  async function send() {
    if (!influence) return
    setSending(true)
    setError('')
    try {
      const res = await sendRec({
        tmdbId: movie.tmdbId, influence, note: note.trim() || undefined,
        toUserIds: to, crewId: crewId || undefined, sessionId,
      })
      if (res.ok) {
        setSent(res.count)
        setTimeout(onDone, 1200)
      } else setError(res.error)
    } catch {
      setError('Could not reach the server. Try again.')
    }
    setSending(false)
  }

  if (sent) {
    return (
      <div role="status" className="py-4 text-center">
        <p className="font-semibold">Sent.</p>
        <p className="font-note text-xl text-note">{sent === 1 ? 'one rec out the door' : `${sent} recs out the door`}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <h3 className="font-display text-xl">Send {movie.title}</h3>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm text-muted">Friends</legend>
        {ctx === null && <span className="text-sm text-faint">Loading...</span>}
        {ctx?.friends.length === 0 && <span className="text-sm text-faint">No friends yet.</span>}
        {ctx?.friends.map((f) => (
          <label key={f.id} className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={to.includes(f.id)}
              onChange={(e) => setTo(e.target.checked ? [...to, f.id] : to.filter((x) => x !== f.id))}
            />
            {f.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={f.avatarUrl} alt="" className="size-7 rounded-full object-cover" />
            ) : (
              <span aria-hidden className="flex size-7 items-center justify-center rounded-full bg-card text-xs uppercase text-muted">{f.username[0]}</span>
            )}
            {f.username}
          </label>
        ))}
      </fieldset>
      {!!ctx?.crews.length && (
        <label className="flex flex-col gap-1 text-sm text-muted">
          Or a crew
          <select value={crewId} onChange={(e) => setCrewId(e.target.value)} className={field}>
            <option value="">No crew</option>
            {ctx.crews.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      )}
      <div className="flex flex-col gap-2">
        <span className="text-sm text-muted">Watch it</span>
        <div className="flex gap-1 rounded-control bg-card p-1">
          {(['drunk', 'high', 'both'] as const).map((i) => (
            <div key={i} className="flex-1 [&>button]:w-full">
              <InfluenceChip influence={i} selected={influence === i} onToggle={() => setInfluence(i)} />
            </div>
          ))}
        </div>
      </div>
      <label className="flex flex-col gap-1 text-sm text-muted">
        Note (optional)
        <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={140} rows={2} className={field} />
        <span className="self-end text-xs text-faint">{note.length}/140</span>
      </label>
      {error && <p role="alert" className="text-sm text-drunk">{error}</p>}
      <button type="button" disabled={!canSend} onClick={send} className="rounded-full bg-accent-fill px-6 py-3 font-semibold text-white disabled:opacity-40">
        {sending ? 'Sending...' : 'Send'}
      </button>
    </div>
  )
}

export function SendRecButton({ movie }: { movie: RecMovie }) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="rounded-full bg-raised px-5 py-3 font-semibold text-text">Send a rec</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/55" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[92vh] max-w-xl overflow-y-auto rounded-t-[20px] bg-raised p-6 text-text"
        >
          <Dialog.Title className="sr-only">Send a rec</Dialog.Title>
          <SendRecForm movie={movie} onDone={() => setOpen(false)} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
