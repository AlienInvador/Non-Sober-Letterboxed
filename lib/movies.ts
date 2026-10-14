import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMovie, type Movie } from '@/lib/tmdb'

const TTL_MS = 24 * 60 * 60 * 1000

export type MovieDb = {
  get(tmdbId: number): Promise<{ movie: Movie; cachedAt: string } | null>
  upsert(movie: Movie): Promise<void>
}

function adminDb(): MovieDb {
  const admin = createAdminClient()
  return {
    async get(id) {
      const { data } = await admin.from('movies').select('*').eq('tmdb_id', id).maybeSingle()
      if (!data) return null
      return {
        cachedAt: data.cached_at,
        movie: {
          tmdbId: data.tmdb_id, title: data.title, year: data.year, posterPath: data.poster_path,
          backdropPath: data.backdrop_path, genres: data.genres ?? [], runtime: data.runtime,
        },
      }
    },
    async upsert(m) {
      const { error } = await admin.from('movies').upsert({
        tmdb_id: m.tmdbId, title: m.title, year: m.year, poster_path: m.posterPath,
        backdrop_path: m.backdropPath, genres: m.genres, runtime: m.runtime, cached_at: new Date().toISOString(),
      })
      if (error) throw new Error(error.message)
    },
  }
}

export async function ensureMovieCached(
  tmdbId: number,
  deps: { db?: MovieDb; fetcher?: (id: number) => Promise<Movie>; now?: () => number } = {},
): Promise<Movie> {
  const { db = adminDb(), fetcher = getMovie, now = Date.now } = deps
  const row = await db.get(tmdbId)
  if (row && now() - new Date(row.cachedAt).getTime() < TTL_MS) return row.movie
  const movie = await fetcher(tmdbId)
  await db.upsert(movie)
  return movie
}
