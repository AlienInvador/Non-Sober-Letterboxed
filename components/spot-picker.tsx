'use client'
import { useEffect, useState } from 'react'
import { nameKey, type PlaceCategory, type SpotHit } from '@/lib/places'

export type PickedSpot = { name: string; category: PlaceCategory | null }
const field = 'rounded-control bg-card px-3 py-2 text-sm text-text'

export function SpotPicker({ onPick }: { onPick: (p: PickedSpot) => void }) {
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<SpotHit[]>([])
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
    setHits([])
    if (!q.trim()) return
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/places/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        if (!res.ok) throw new Error()
        setHits(await res.json())
        setFailed(false)
      } catch (e) {
        if ((e as Error).name !== 'AbortError') { setHits([]); setFailed(true) }
      }
    }, 300)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [q])

  const shown = q.trim() ? hits : []
  const typed = q.trim()
  const key = nameKey(typed)
  const showTyped = key !== '' && !shown.some((h) => nameKey(h.name) === key)

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm text-muted">
        Spot
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Taco Bell, a diner, grandma's basement" className={field} />
      </label>
      {failed && <p role="alert" className="text-sm text-drunk">Spot search is unavailable. You can still use the name you typed.</p>}
      <div aria-live="polite" className="flex flex-col">
        {shown.map((h, i) => (
          <button key={`${h.placeId ?? h.name}-${i}`} type="button" onClick={() => onPick({ name: h.name, category: h.category })} className="flex items-baseline gap-2 rounded-control px-3 py-2 text-left hover:bg-selected">
            <span className="font-display">{h.name}</span>
            {h.category && <span className="text-sm text-muted">{h.category.replace('_', ' ')}</span>}
          </button>
        ))}
        {showTyped && (
          <button type="button" onClick={() => onPick({ name: typed, category: null })} className="rounded-control px-3 py-2 text-left hover:bg-selected">
            use “{typed}”
          </button>
        )}
      </div>
    </div>
  )
}
