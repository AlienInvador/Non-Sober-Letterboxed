'use client'
import Link from 'next/link'
import type { MovieSummary } from '@/lib/tmdb'
import { useLogSheet } from '@/components/log-sheet'

export function HeroActions({ movie }: { movie: MovieSummary }) {
  const { open } = useLogSheet()
  return (
    <div className="mt-6 flex flex-wrap gap-3">
      <button type="button" onClick={() => open(movie)} className="rounded-full bg-accent-fill px-6 py-3 font-semibold text-white">
        Log a sesh
      </button>
      <Link href={`/movie/${movie.tmdbId}`} className="rounded-full bg-raised px-6 py-3 font-semibold text-text">
        See how it hits
      </Link>
    </div>
  )
}
