'use client'
import { useState, useTransition } from 'react'
import { createList } from '@/actions/lists'

const field = 'h-10 rounded-control bg-card px-3 text-sm text-text'

export function NewListForm({ crewId, onCreated, label = 'Create' }: { crewId?: string; onCreated(id: string): void; label?: string }) {
  const [title, setTitle] = useState('')
  const [visibility, setVisibility] = useState<'private' | 'friends' | 'public'>('friends')
  const [error, setError] = useState('')
  const [pending, start] = useTransition()
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        start(async () => {
          const r = await createList({ title, visibility, crewId }).catch(() => ({ ok: false, error: 'Something went wrong. Try again.', id: undefined }))
          if (r.ok && r.id) onCreated(r.id)
          else setError(r.error ?? '')
        })
      }}
    >
      <input aria-label="List title" placeholder="List title" value={title} onChange={(e) => setTitle(e.target.value)} className={field} />
      <select aria-label="Visibility" value={visibility} onChange={(e) => setVisibility(e.target.value as typeof visibility)} className={field}>
        <option value="private">Only me</option>
        <option value="friends">Friends</option>
        <option value="public">Public</option>
      </select>
      <button disabled={pending} className="rounded-full bg-accent-fill px-4 py-2 text-sm font-semibold text-white">{label}</button>
      {error && <p role="alert" className="w-full text-sm text-drunk">{error}</p>}
    </form>
  )
}

export function NewCrewList({ crewId }: { crewId: string }) {
  const [open, setOpen] = useState(false)
  return open ? (
    <div className="mt-4">
      <NewListForm crewId={crewId} label="Create crew list" onCreated={(id) => { window.location.href = `/lists/${id}` }} />
    </div>
  ) : (
    <button type="button" onClick={() => setOpen(true)} className="mt-4 rounded-full bg-raised px-4 py-2 text-sm font-semibold text-text">New crew list</button>
  )
}
