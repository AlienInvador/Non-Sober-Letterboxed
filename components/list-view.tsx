'use client'
import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Reorder } from 'motion/react'
import { removeFromList, reorderList, updateList } from '@/actions/lists'
import { moveItem } from '@/lib/reorder'
import type { ListPage } from '@/lib/queries/lists'

type Item = ListPage['items'][number]
const btn = 'rounded-full bg-raised px-3 py-1 text-xs text-muted aria-disabled:opacity-40'
const field = 'rounded-control bg-card px-3 py-2 text-sm text-text'

export function ListItems({ listId, initial, canWrite }: { listId: string; initial: Item[]; canWrite: boolean }) {
  const [items, setItems] = useState(initial)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [focus, setFocus] = useState<{ id: number; dir: 'up' | 'down' } | null>(null)
  const lastSaved = useRef(initial)
  const latest = useRef(items)
  latest.current = items
  const busy = useRef(false)
  const ids = (xs: Item[]) => xs.map((i) => i.movie.tmdbId)

  useEffect(() => {
    if (focus) document.querySelector<HTMLElement>(`[data-move="${focus.dir}-${focus.id}"]`)?.focus()
  }, [focus, items])

  async function persist(next: Item[], announce?: string) {
    if (busy.current) return
    if (ids(next).join() === ids(lastSaved.current).join()) { setItems(next); return }
    busy.current = true
    setItems(next)
    const r = await reorderList(listId, ids(next)).catch(() => ({ ok: false, error: 'Something went wrong. Try again.' }))
    busy.current = false
    if (r.ok) { lastSaved.current = next; setError(''); if (announce) setStatus(announce) }
    else { setItems(lastSaved.current); setError(r.error ?? 'Could not reorder.') }
  }
  const move = (from: number, to: number, dir: 'up' | 'down') => {
    if (busy.current || to < 0 || to >= items.length) return
    const it = items[from]
    setFocus({ id: it.movie.tmdbId, dir })
    persist(moveItem(items, from, to), `Moved ${it.movie.title} to position ${to + 1}`)
  }
  async function remove(tmdbId: number) {
    if (busy.current) return
    busy.current = true
    const r = await removeFromList(listId, tmdbId).catch(() => ({ ok: false, error: 'Something went wrong. Try again.' }))
    busy.current = false
    if (r.ok) {
      const rest = latest.current.filter((i) => i.movie.tmdbId !== tmdbId)
      lastSaved.current = lastSaved.current.filter((i) => i.movie.tmdbId !== tmdbId)
      setItems(rest)
      setFocus(null)
      setStatus('Removed from the list')
    } else setError(r.error ?? 'Could not remove.')
  }

  if (items.length === 0) return <p className="mt-6 text-muted">Nothing on this list yet.{canWrite && ' Add movies from their page.'}</p>
  return (
    <>
      <p role="status" aria-live="polite" className="sr-only">{status}</p>
      {error && <p role="alert" className="mt-4 text-sm text-drunk">{error}</p>}
      <Reorder.Group axis="y" values={items} onReorder={setItems} as="ol" className="mt-6 divide-y divide-line">
        {items.map((it, idx) => {
          const m = it.movie
          const poster = m.posterPath && `https://image.tmdb.org/t/p/w185${m.posterPath}`
          return (
            <Reorder.Item
              key={m.tmdbId} value={it} as="li" drag={canWrite ? 'y' : false}
              onDragEnd={() => canWrite && persist(latest.current)}
              className="flex items-center gap-4 bg-bg py-4"
            >
              {canWrite && <span aria-hidden className="cursor-grab select-none text-faint">⋮⋮</span>}
              <Link href={`/movie/${m.tmdbId}`} className="aspect-[2/3] w-14 shrink-0 overflow-hidden rounded-poster bg-raised">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {poster && <img src={poster} alt="" draggable={false} className="size-full object-cover" />}
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/movie/${m.tmdbId}`} className="font-medium">{m.title}</Link>
                {m.year && <span className="ml-2 text-sm text-muted">{m.year}</span>}
                {it.note && <p className="font-note text-lg text-note">{it.note}</p>}
              </div>
              {canWrite && (
                <div className="flex gap-2">
                  <button type="button" data-move={`up-${m.tmdbId}`} aria-disabled={idx === 0} aria-label={`Move ${m.title} up`} onClick={() => move(idx, idx - 1, 'up')} className={btn}>Up</button>
                  <button type="button" data-move={`down-${m.tmdbId}`} aria-disabled={idx === items.length - 1} aria-label={`Move ${m.title} down`} onClick={() => move(idx, idx + 1, 'down')} className={btn}>Down</button>
                  <button type="button" aria-label={`Remove ${m.title}`} onClick={() => remove(m.tmdbId)} className={btn}>Remove</button>
                </div>
              )}
            </Reorder.Item>
          )
        })}
      </Reorder.Group>
    </>
  )
}

export function EditListForm({ list }: { list: Pick<ListPage, 'id' | 'title' | 'description' | 'visibility'> }) {
  const router = useRouter()
  const [title, setTitle] = useState(list.title)
  const [description, setDescription] = useState(list.description ?? '')
  const [visibility, setVisibility] = useState(list.visibility)
  const [error, setError] = useState('')
  const [pending, start] = useTransition()
  return (
    <details className="mt-4">
      <summary className="cursor-pointer text-sm text-muted">Edit list</summary>
      <form
        className="mt-3 flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          start(async () => {
            const r = await updateList(list.id, { title, description, visibility: visibility as 'private' | 'friends' | 'public' }).catch(() => ({ ok: false, error: 'Something went wrong. Try again.' }))
            setError(r.ok ? '' : r.error ?? '')
            if (r.ok) router.refresh()
          })
        }}
      >
        <input aria-label="List title" value={title} onChange={(e) => setTitle(e.target.value)} className={field} />
        <textarea aria-label="List description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={field} />
        <select aria-label="Visibility" value={visibility} onChange={(e) => setVisibility(e.target.value)} className={field}>
          <option value="private">Only me</option>
          <option value="friends">Friends</option>
          <option value="public">Public</option>
        </select>
        {error && <p role="alert" className="text-sm text-drunk">{error}</p>}
        <button disabled={pending} className="self-start rounded-full bg-accent-fill px-5 py-2 text-sm font-semibold text-white">Save</button>
      </form>
    </details>
  )
}
