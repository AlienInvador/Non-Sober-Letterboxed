'use client'
import Link from 'next/link'
import { useReducedMotion } from 'motion/react'
import type { MovieSummary } from '@/lib/tmdb'
import type { Influence } from '@/lib/influence'
import { InfluenceDot } from '@/components/influence-chip'
import { influenceLabel } from '@/lib/influence'

export function PosterTile({ movie, influence, href }: { movie: MovieSummary; influence?: Influence; href: string }) {
  const reduce = useReducedMotion()
  return (
    <Link
      href={href}
      className={`relative block aspect-[2/3] overflow-hidden rounded-poster bg-raised ${
        reduce ? '' : 'transition-transform duration-200 ease-out-soft hover:-translate-y-0.5 hover:scale-[1.02]'
      }`}
    >
      {movie.posterPath ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`https://image.tmdb.org/t/p/w342${movie.posterPath}`} alt={movie.title} className="size-full object-cover" />
      ) : (
        <span className="flex size-full items-center justify-center p-2 text-center text-xs text-muted">{movie.title}</span>
      )}
      {influence && (
        <span className="absolute bottom-1 left-1 inline-flex items-center gap-1 rounded-full bg-bg/80 px-2 py-0.5 text-[10px] text-text">
          <InfluenceDot influence={influence} />
          {influenceLabel(influence)}
        </span>
      )}
    </Link>
  )
}
