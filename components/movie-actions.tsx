'use client'
import { useLogSheet } from '@/components/log-sheet'
import type { Movie } from '@/lib/tmdb'

const secondary = 'rounded-full bg-raised px-5 py-3 font-semibold text-muted disabled:cursor-not-allowed'

export function MovieActions({ movie }: { movie: Movie }) {
  const { open } = useLogSheet()
  return (
    <div className="mt-6 flex flex-wrap gap-3">
      <button type="button" onClick={() => open(movie)} className="rounded-full bg-accent-fill px-5 py-3 font-semibold text-white">
        Log a sesh
      </button>
      <button type="button" disabled aria-disabled title="Coming soon" className={secondary}>Add to queue</button>
      <button type="button" disabled aria-disabled title="Coming soon" className={secondary}>Add to list</button>
    </div>
  )
}
