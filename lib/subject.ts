import type { MovieSummary } from '@/lib/tmdb'

export type PlaceSummary = { id: string; name: string; category: string | null }
export type Subject = { kind: 'movie'; movie: MovieSummary } | { kind: 'place'; place: PlaceSummary }

export const SUBJECT = 'movies(tmdb_id, title, year, poster_path), places(id, name, category)'

type MovieRow = { tmdb_id: number; title: string; year: number | null; poster_path: string | null }

export function subjectOf(row: { movies?: unknown; places?: unknown }): Subject | null {
  const m = row.movies as MovieRow | null | undefined
  if (m) return { kind: 'movie', movie: { tmdbId: m.tmdb_id, title: m.title, year: m.year, posterPath: m.poster_path } }
  const p = row.places as PlaceSummary | null | undefined
  if (p) return { kind: 'place', place: { id: p.id, name: p.name, category: p.category } }
  return null
}

export const subjectHref = (s: Subject): string =>
  s.kind === 'movie' ? `/movie/${s.movie.tmdbId}` : `/place/${s.place.id}`

export const subjectTitle = (s: Subject): string => (s.kind === 'movie' ? s.movie.title : s.place.name)
