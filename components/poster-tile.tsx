import Link from 'next/link'
import type { MovieSummary } from '@/lib/tmdb'

export function PosterTile({ movie, href }: { movie: MovieSummary; href: string }) {
  return (
    <Link
      href={href}
      className="block aspect-[2/3] overflow-hidden rounded-poster bg-raised motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out-soft motion-safe:hover:-translate-y-0.5"
    >
      {movie.posterPath ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`https://image.tmdb.org/t/p/w342${movie.posterPath}`} alt={movie.title} className="size-full object-cover" />
      ) : (
        <span className="flex size-full items-center justify-center p-2 text-center text-xs text-muted">{movie.title}</span>
      )}
    </Link>
  )
}
