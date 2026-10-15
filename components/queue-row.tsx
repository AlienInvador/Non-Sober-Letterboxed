'use client'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { removeFromQueue } from '@/actions/queue'
import { useLogSheet } from '@/components/log-sheet'
import type { Movie } from '@/lib/tmdb'

export function QueueRow({ movie }: { movie: Movie }) {
  const { open } = useLogSheet()
  const [pending, start] = useTransition()
  const [error, setError] = useState('')
  const poster = movie.posterPath && `https://image.tmdb.org/t/p/w185${movie.posterPath}`
  return (
    <li className="flex items-center gap-4 py-4">
      <Link href={`/movie/${movie.tmdbId}`} className="aspect-[2/3] w-14 shrink-0 overflow-hidden rounded-poster bg-raised">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {poster && <img src={poster} alt="" className="size-full object-cover" />}
      </Link>
      <Link href={`/movie/${movie.tmdbId}`} className="min-w-0 flex-1 font-medium">
        {movie.title}
        {movie.year && <span className="ml-2 text-sm text-muted">{movie.year}</span>}
      </Link>
      <button type="button" onClick={() => open(movie)} className="rounded-full bg-accent-fill px-4 py-2 text-sm font-semibold text-white">Log a sesh</button>
      <button
        type="button" disabled={pending} aria-label={`Remove ${movie.title} from your queue`}
        onClick={() => start(async () => { const r = await removeFromQueue(movie.tmdbId); setError(r.ok ? '' : r.error ?? 'Failed') })}
        className="rounded-full bg-raised px-3 py-2 text-sm text-muted"
      >
        Remove
      </button>
      {error && <span role="alert" className="text-xs text-drunk">{error}</span>}
    </li>
  )
}
