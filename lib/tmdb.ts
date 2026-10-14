import 'server-only'

export type MovieSummary = { tmdbId: number; title: string; year: number | null; posterPath: string | null }
export type Movie = MovieSummary & { backdropPath: string | null; genres: string[]; runtime: number | null }

export class TmdbError extends Error {}

type Raw = { id: number; title: string; release_date?: string | null; poster_path?: string | null }

async function tmdb(path: string, params: Record<string, string>, fetcher: typeof fetch) {
  const key = process.env.TMDB_API_KEY ?? ''
  const url = new URL(`https://api.themoviedb.org/3${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const headers: Record<string, string> = {}
  if (key.length <= 40) url.searchParams.set('api_key', key)
  else headers.Authorization = `Bearer ${key}`
  let res: Response
  try {
    res = await fetcher(url.toString(), { headers })
  } catch (e) {
    throw new TmdbError(`TMDB request failed: ${e}`)
  }
  if (!res.ok) throw new TmdbError(`TMDB ${res.status}`)
  return res.json()
}

const summary = (r: Raw): MovieSummary => ({
  tmdbId: r.id,
  title: r.title,
  year: r.release_date ? Number(r.release_date.slice(0, 4)) || null : null,
  posterPath: r.poster_path ?? null,
})

export async function searchMovies(q: string, fetcher: typeof fetch = fetch): Promise<MovieSummary[]> {
  if (!q.trim()) return []
  const data = await tmdb('/search/movie', { query: q.trim() }, fetcher)
  return (data.results as Raw[]).map(summary)
}

export async function getMovie(tmdbId: number, fetcher: typeof fetch = fetch): Promise<Movie> {
  const d = await tmdb(`/movie/${tmdbId}`, {}, fetcher)
  return {
    ...summary(d),
    backdropPath: d.backdrop_path ?? null,
    genres: (d.genres ?? []).map((g: { name: string }) => g.name),
    runtime: d.runtime || null,
  }
}

export function posterUrl(path: string | null, size: 'w185' | 'w342' | 'w500' | 'w780' | 'w1280'): string | null {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null
}
