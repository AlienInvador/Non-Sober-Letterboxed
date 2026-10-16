'use client'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { Dialog } from 'radix-ui'
import { motion } from 'motion/react'
import { Check } from 'lucide-react'
import type { MovieSummary } from '@/lib/tmdb'
import { influenceFromChips } from '@/lib/influence'
import { InfluenceChip } from '@/components/influence-chip'
import { RecommendToggle } from '@/components/recommend-toggle'
import { createSession, getLogContext, type LogContext } from '@/actions/sessions'
import { SendRecForm } from '@/components/send-rec'

export type LogPreset = { watchedOn?: string; companionIds?: string[]; fromTagSessionId?: string }
type Ctx = { open(movie?: MovieSummary, preset?: LogPreset): void }
const LogSheetCtx = createContext<Ctx>({ open: () => {} })
export const useLogSheet = () => useContext(LogSheetCtx)

export function LogButton() {
  const { open } = useLogSheet()
  return (
    <button type="button" onClick={() => open()} className="rounded-full bg-accent-fill px-5 py-3 font-semibold text-white">
      Log a sesh
    </button>
  )
}

export function LogSheetProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setOpen] = useState(false)
  const [initial, setInitial] = useState<MovieSummary | null>(null)
  const [preset, setPreset] = useState<LogPreset>({})
  const [toast, setToast] = useState(false)
  const open = useCallback((movie?: MovieSummary, p?: LogPreset) => {
    setInitial(movie ?? null)
    setPreset(p ?? {})
    setOpen(true)
  }, [])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(false), 2500)
    return () => clearTimeout(t)
  }, [toast])

  return (
    <LogSheetCtx.Provider value={{ open }}>
      {children}
      <Dialog.Root open={isOpen} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/55" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[92vh] max-w-xl overflow-y-auto rounded-t-[20px] bg-raised p-6 text-text data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom"
          >
            <Dialog.Title className="sr-only">Log a sesh</Dialog.Title>
            <LogForm
              initial={initial}
              preset={preset}
              onSaved={(autoClose) => {
                setToast(true)
                if (autoClose) setTimeout(() => setOpen(false), 1400)
              }}
              onClose={() => setOpen(false)}
            />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      {toast && (
        <div role="status" className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-selected px-5 py-2 text-sm">
          Logged
        </div>
      )}
    </LogSheetCtx.Provider>
  )
}

const NOTE = { drunk: 'a few drinks in', high: 'nicely high', both: 'drunk and high, a whole night', sober: 'sober, for science' }
const field = 'rounded-control bg-card px-3 py-2 text-sm text-text'

function LogForm({ initial, preset, onSaved, onClose }: { initial: MovieSummary | null; preset: LogPreset; onSaved: (autoClose: boolean) => void; onClose: () => void }) {
  const [movie, setMovie] = useState<MovieSummary | null>(initial)
  const [chips, setChips] = useState({ drunk: false, high: false, sober: false })
  const [recommend, setRecommend] = useState<boolean | null>(null)
  const [more, setMore] = useState(false)
  const [ctx, setCtx] = useState<LogContext | null>(null)
  const [companions, setCompanions] = useState<string[]>(preset.companionIds ?? [])
  const [visibility, setVisibility] = useState<'private' | 'crew' | 'friends' | 'public'>('friends')
  const [crewId, setCrewId] = useState('')
  const [review, setReview] = useState('')
  const [rewatch, setRewatch] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [sessionId, setSessionId] = useState('')
  const [recOpen, setRecOpen] = useState(false)

  const influence = influenceFromChips(chips)
  const crewMissing = visibility === 'crew' && !crewId
  const canSave = !!movie && !!influence && (influence === 'sober' || recommend !== null) && !crewMissing && !saving

  useEffect(() => {
    if (more && !ctx) getLogContext().then(setCtx).catch(() => setCtx({ friends: [], crews: [] }))
  }, [more, ctx])

  const pick = (k: 'drunk' | 'high') => setChips((c) => ({ ...c, [k]: !c[k], sober: false }))

  async function save() {
    if (!movie || !influence) return
    setSaving(true)
    setError('')
    try {
      const res = await createSession({
        tmdbId: movie.tmdbId, influence,
        recommend: influence === 'sober' ? null : recommend,
        review: review.trim() || null, visibility,
        crewId: visibility === 'crew' ? crewId : null,
        companionIds: companions, rewatch, fromTagSessionId: preset.fromTagSessionId,
        watchedOn: preset.watchedOn ?? new Date().toLocaleDateString('en-CA'),
      })
      if (res.ok) {
        setDone(true)
        setSessionId(res.id)
        // a recommended sesh stays open so the "Send this rec" offer can be used
        onSaved(!(influence !== 'sober' && recommend === true))
      } else setError(res.error)
    } catch {
      setError('Could not reach the server. Your picks are still here, try again.')
    }
    setSaving(false)
  }

  if (!movie) return <MoviePicker onPick={setMovie} />
  if (recOpen && influence && influence !== 'sober') {
    return <SendRecForm movie={movie} influence={influence} sessionId={sessionId} onDone={onClose} />
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <div className="h-24 w-16 shrink-0 overflow-hidden rounded-poster bg-card">
          {movie.posterPath && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`https://image.tmdb.org/t/p/w185${movie.posterPath}`} alt="" className="size-full object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl">{movie.title}</p>
          <p className="text-sm text-muted">{movie.year ?? ''}</p>
        </div>
        <button type="button" onClick={() => setMovie(null)} className="text-sm text-muted underline">Change</button>
      </div>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm text-muted">How were you watching?</h3>
        <div className="flex gap-1 rounded-control bg-card p-1">
          <div className="flex-1 [&>button]:w-full"><InfluenceChip influence="drunk" size="lg" selected={chips.drunk} onToggle={() => pick('drunk')} /></div>
          <div className="flex-1 [&>button]:w-full"><InfluenceChip influence="high" size="lg" selected={chips.high} onToggle={() => pick('high')} /></div>
        </div>
        <p className="font-note text-xl text-note">{influence ? NOTE[influence] : 'pick one, or both'}</p>
        <button
          type="button"
          onClick={() => setChips({ drunk: false, high: false, sober: true })}
          className="self-start text-sm text-muted underline"
        >
          I was sober
        </button>
      </section>

      {influence && <RecommendToggle influence={influence} value={recommend} onChange={setRecommend} />}

      <div className="flex flex-col gap-3">
        <button type="button" aria-expanded={more} onClick={() => setMore(!more)} className="self-start text-sm text-muted">
          {more ? '- More' : '+ More'}
        </button>
        {more && (
          <div className="flex flex-col gap-3">
            <fieldset className="flex flex-wrap gap-2">
              <legend className="mb-1 text-sm text-muted">Watched with</legend>
              {ctx?.friends.length === 0 && <span className="text-sm text-faint">No friends yet.</span>}
              {ctx?.friends.map((f) => (
                <label key={f.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={companions.includes(f.id)}
                    onChange={(e) => setCompanions(e.target.checked ? [...companions, f.id] : companions.filter((x) => x !== f.id))}
                  />
                  {f.name}
                </label>
              ))}
            </fieldset>
            <label className="flex flex-col gap-1 text-sm text-muted">
              Visibility
              <select value={visibility} onChange={(e) => setVisibility(e.target.value as typeof visibility)} className={field}>
                <option value="friends">Friends</option>
                <option value="crew">Crew</option>
                <option value="public">Public</option>
                <option value="private">Only me</option>
              </select>
            </label>
            {visibility === 'crew' && (
              <label className="flex flex-col gap-1 text-sm text-muted">
                Crew
                <select value={crewId} onChange={(e) => setCrewId(e.target.value)} className={field}>
                  <option value="">Pick a crew</option>
                  {ctx?.crews.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
            )}
            <textarea value={review} onChange={(e) => setReview(e.target.value)} placeholder="Review (optional)" rows={3} className={field} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={rewatch} onChange={(e) => setRewatch(e.target.checked)} /> Rewatch
            </label>
          </div>
        )}
      </div>

      {error && <p role="alert" className="text-sm text-drunk">{error}</p>}

      {done ? (
        <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.2 }} className="flex flex-col items-center gap-1 py-2">
          <Check aria-hidden className="size-8 text-high" />
          <p className="font-semibold">Logged.</p>
          <p className="font-note text-xl text-note">cheers to that.</p>
          {influence !== 'sober' && recommend === true && (
            <button type="button" onClick={() => setRecOpen(true)} className="mt-2 text-sm font-semibold text-accent underline">
              Send this rec to…
            </button>
          )}
        </motion.div>
      ) : (
        <button type="button" disabled={!canSave} onClick={save} className="rounded-full bg-accent-fill px-6 py-3 font-semibold text-white disabled:opacity-40">
          {saving ? 'Saving...' : 'Save sesh'}
        </button>
      )}
    </div>
  )
}

function MoviePicker({ onPick }: { onPick: (m: MovieSummary) => void }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<MovieSummary[]>([])
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!q.trim()) return
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        if (!res.ok) throw new Error()
        setResults(await res.json())
        setFailed(false)
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setFailed(true)
      }
    }, 250)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [q])

  return (
    <div className="flex flex-col gap-3">
      <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a movie" aria-label="Search a movie" className={field} />
      {failed && <p role="alert" className="text-sm text-drunk">Movie search is unavailable. Try again.</p>}
      <div role="listbox" aria-label="Results" className="flex flex-col">
        {results.map((m) => (
          <button key={m.tmdbId} type="button" role="option" aria-selected={false} onClick={() => onPick(m)} className="flex items-baseline gap-2 rounded-control px-3 py-2 text-left hover:bg-selected">
            <span className="font-display">{m.title}</span>
            <span className="text-sm text-muted">{m.year}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
