'use client'
import { useId, useRef, useState, useTransition } from 'react'
import { useLogSheet } from '@/components/log-sheet'
import { SendRecButton } from '@/components/send-rec'
import { NewListForm } from '@/components/new-list-form'
import { toggleQueue } from '@/actions/queue'
import { addToList, getMyWritableLists, type MyList } from '@/actions/lists'
import type { Movie } from '@/lib/tmdb'

const secondary = 'rounded-full bg-raised px-5 py-3 font-semibold text-text'

function AddToList({ movie }: { movie: Movie }) {
  const [open, setOpen] = useState(false)
  const [lists, setLists] = useState<MyList[] | null>(null)
  const [creating, setCreating] = useState(false)
  const [msg, setMsg] = useState('')
  const panel = useId()
  const trigger = useRef<HTMLButtonElement>(null)

  async function add(listId: string, title: string) {
    const r = await addToList(listId, movie.tmdbId).catch(() => ({ ok: false, error: 'Something went wrong. Try again.' }))
    setMsg(r.ok ? `Added to ${title}.` : r.error ?? '')
  }
  function toggle() {
    if (!open) getMyWritableLists().then(setLists).catch(() => setLists([]))
    setOpen(!open)
    setMsg('')
  }
  return (
    <div className="relative" onKeyDown={(e) => { if (e.key === 'Escape' && open) { setOpen(false); trigger.current?.focus() } }}>
      <button ref={trigger} type="button" aria-expanded={open} aria-controls={panel} onClick={toggle} className={secondary}>Add to list</button>
      {open && (
        <div id={panel} className="absolute left-0 top-full z-30 mt-2 w-72 rounded-[12px] bg-raised p-3 shadow-lg">
          {lists === null && <p className="text-sm text-faint">Loading...</p>}
          {lists?.map((l) => (
            <button key={l.id} type="button" onClick={() => add(l.id, l.title)} className="block w-full rounded-control px-3 py-2 text-left text-sm hover:bg-card">
              {l.title}{l.crewName && <span className="ml-2 text-xs text-muted">{l.crewName}</span>}
            </button>
          ))}
          {creating ? (
            <div className="mt-2">
              <NewListForm onCreated={(id) => { setCreating(false); getMyWritableLists().then(setLists); add(id, 'your new list') }} />
            </div>
          ) : (
            <button type="button" onClick={() => setCreating(true)} className="mt-1 block w-full rounded-control px-3 py-2 text-left text-sm text-accent hover:bg-card">New list…</button>
          )}
          {msg && <p role="status" className="mt-2 px-3 text-sm text-muted">{msg}</p>}
        </div>
      )}
    </div>
  )
}

export function MovieActions({ movie, queued: initialQueued = false }: { movie: Movie; queued?: boolean }) {
  const { open } = useLogSheet()
  const [queued, setQueued] = useState(initialQueued)
  const [error, setError] = useState('')
  const [pending, start] = useTransition()
  return (
    <div className="mt-6 flex flex-wrap gap-3">
      <button type="button" onClick={() => open(movie)} className="rounded-full bg-accent-fill px-5 py-3 font-semibold text-white">
        Log a sesh
      </button>
      <SendRecButton movie={movie} />
      <button
        type="button" aria-pressed={queued} disabled={pending}
        onClick={() => start(async () => {
          const r = await toggleQueue(movie.tmdbId).catch(() => ({ ok: false as const, error: 'Something went wrong. Try again.' }))
          if (r.ok) { setQueued(r.queued); setError('') } else setError(r.error)
        })}
        className={secondary}
      >
        {queued ? 'In your queue' : 'Add to queue'}
      </button>
      <AddToList movie={movie} />
      {error && <p role="alert" className="w-full text-sm text-drunk">{error}</p>}
    </div>
  )
}
