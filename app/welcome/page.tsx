import { Landing } from '@/components/landing/landing'
import { getMovie, type Movie } from '@/lib/tmdb'

export const revalidate = 86400

// shortcut: stats view is authenticated-only, so pcts are illustrative; wire to live stats if it goes public
const PICKS = [
  { title: 'Spirited Away', tmdbId: 129, influence: 'high', pct: 94 },
  { title: 'Hot Fuzz', tmdbId: 4551, influence: 'drunk', pct: 90 },
  { title: 'Mad Max: Fury Road', tmdbId: 76341, influence: 'both', pct: 91 },
  { title: 'Paprika', tmdbId: 11659, influence: 'high', pct: 91 },
  { title: 'Step Brothers', tmdbId: 12133, influence: 'drunk', pct: 88 },
  { title: '2001: A Space Odyssey', tmdbId: 62, influence: 'high', pct: 92 },
  { title: 'Inception', tmdbId: 27205, influence: 'both', pct: 89 },
  { title: 'Superbad', tmdbId: 8363, influence: 'drunk', pct: 87 },
] as const

export default async function Welcome() {
  const movies = await Promise.all(PICKS.map((p) => getMovie(p.tmdbId).catch(() => null)))
  const picks = PICKS.map((p, i) => ({ ...p, movie: movies[i] as Movie | null }))
  return <Landing picks={picks} />
}
