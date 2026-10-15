'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import { searchUsers, type FriendProfile } from '@/actions/friends'
import { getMyWritableLists, type MyList } from '@/actions/lists'

type Movie = { tmdbId: number; title: string; year: number | null }

const group = 'px-2 py-1 text-xs text-muted [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1'
const item = 'flex cursor-pointer items-center justify-between rounded-control px-3 py-2 text-sm data-[selected=true]:bg-card'

export function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [movies, setMovies] = useState<Movie[]>([])
  const [people, setPeople] = useState<FriendProfile[]>([])
  const [lists, setLists] = useState<MyList[]>([])
  const [down, setDown] = useState(false)
  const run = useRef(0)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const search = useCallback(async (term: string) => {
    const id = ++run.current // ignore stale responses
    setDown(false)
    const [m, p, l] = await Promise.all([
      fetch(`/api/tmdb/search?q=${encodeURIComponent(term)}`).then((r) => (r.ok ? (r.json() as Promise<Movie[]>) : null), () => null),
      searchUsers(term).catch(() => []),
      getMyWritableLists().catch(() => []),
    ])
    if (id !== run.current) return
    setDown(m === null)
    setMovies(m ?? [])
    setPeople(p)
    setLists(l.filter((x) => x.title.toLowerCase().includes(term.toLowerCase())))
  }, [])

  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) {
      run.current++
      setMovies([]); setPeople([]); setLists([]); setDown(false)
      return
    }
    const t = setTimeout(() => search(term), 250)
    return () => clearTimeout(t)
  }, [q, search])

  const go = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={(o) => { setOpen(o); if (!o) setQ('') }}
      shouldFilter={false}
      label="Search"
      overlayClassName="fixed inset-0 z-40 bg-black/55"
      contentClassName="fixed left-1/2 top-[15vh] z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-card bg-raised text-text"
    >
      <Command.Input
        value={q}
        onValueChange={setQ}
        placeholder="Search movies, people, lists"
        className="w-full bg-raised px-4 py-3 text-base outline-none placeholder:text-muted"
      />
      <Command.List className="max-h-[50vh] overflow-y-auto p-2">
        {down && (
          <button type="button" onClick={() => search(q.trim())} className="w-full rounded-control px-3 py-2 text-left text-sm text-accent">
            Search is down — retry
          </button>
        )}
        {movies.length > 0 && (
          <Command.Group heading="Movies" className={group}>
            {movies.slice(0, 6).map((m) => (
              <Command.Item key={m.tmdbId} value={`movie-${m.tmdbId}`} onSelect={() => go(`/movie/${m.tmdbId}`)} className={item}>
                {m.title}
                <span className="text-muted">{m.year}</span>
              </Command.Item>
            ))}
          </Command.Group>
        )}
        {people.length > 0 && (
          <Command.Group heading="People" className={group}>
            {people.map((p) => (
              <Command.Item key={p.id} value={`person-${p.id}`} onSelect={() => go(`/u/${p.username}`)} className={item}>
                {p.display_name ?? p.username}
                <span className="text-muted">@{p.username}</span>
              </Command.Item>
            ))}
          </Command.Group>
        )}
        {lists.length > 0 && (
          <Command.Group heading="Lists" className={group}>
            {lists.map((l) => (
              <Command.Item key={l.id} value={`list-${l.id}`} onSelect={() => go(`/lists/${l.id}`)} className={item}>
                {l.title}
                {l.crewName && <span className="text-muted">{l.crewName}</span>}
              </Command.Item>
            ))}
          </Command.Group>
        )}
      </Command.List>
    </Command.Dialog>
  )
}
