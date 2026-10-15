import 'server-only'
import { createServerClient } from '@/lib/supabase/server'
import { rankForDiscover } from '@/lib/stats'
import type { Influence } from '@/lib/influence'
import type { MovieSummary } from '@/lib/tmdb'

export type DiscoverTab = 'high' | 'drunk' | 'both'
export type DiscoverRow = {
  movie: MovieSummary; genre: string | null; logCount: number; recommendPct: number
  friends: { recommend: number; total: number } | null
}
export type Trending = { movie: MovieSummary; friendCount: number }

type MovieRow = { tmdb_id: number; title: string; year: number | null; poster_path: string | null; genres: string[] | null }
const movieOf = (m: MovieRow): MovieSummary => ({ tmdbId: m.tmdb_id, title: m.title, year: m.year, posterPath: m.poster_path })

async function friendIds(sb: Awaited<ReturnType<typeof createServerClient>>, me: string) {
  const { data, error } = await sb.from('friendships').select('user_a, user_b').eq('status', 'accepted').or(`user_a.eq.${me},user_b.eq.${me}`)
  if (error) throw new Error(error.message)
  return (data ?? []).map((f) => (f.user_a === me ? f.user_b : f.user_a))
}

export async function getDiscover(tab: DiscoverTab, genre?: string) {
  const sb = await createServerClient()
  const { data: auth } = await sb.auth.getUser()
  const me = auth.user?.id
  if (!me) throw new Error('not signed in')
  const since = new Date(Date.now() - 14 * 864e5).toISOString()

  // shortcut: ranks in JS over all movies of this state, move to SQL if the catalog grows large
  const [statsRes, moviesRes, friends] = await Promise.all([
    sb.from('movie_influence_stats').select('tmdb_id, influence, log_count, recommend_pct').eq('influence', tab),
    sb.from('movies').select('tmdb_id, title, year, poster_path, genres'),
    friendIds(sb, me),
  ])
  for (const r of [statsRes, moviesRes]) if (r.error) throw new Error(r.error.message)
  const movies = new Map((moviesRes.data ?? []).map((m) => [m.tmdb_id, m as MovieRow]))
  const genres = [...new Set((moviesRes.data ?? []).flatMap((m) => m.genres ?? []))].sort()

  const ranked = rankForDiscover(
    (statsRes.data ?? []).map((r) => ({
      tmdbId: r.tmdb_id as number, influence: r.influence as Influence, logCount: Number(r.log_count),
      recommendPct: r.recommend_pct === null ? null : Number(r.recommend_pct),
    })),
    tab,
  ).filter((r) => movies.has(r.tmdbId) && (!genre || movies.get(r.tmdbId)!.genres?.includes(genre)))

  // RLS limits these to seshes the caller can read; one query covers verdicts and trending
  const sess = friends.length
    ? await sb.from('sessions').select('user_id, tmdb_id, influence, recommend, created_at')
        .in('user_id', friends).order('created_at', { ascending: false }).limit(1000)
    : { data: [], error: null }
  if (sess.error) throw new Error(sess.error.message)
  const rows = sess.data ?? []

  const listed = new Set(ranked.map((r) => r.tmdbId))
  const latest = new Map<string, boolean | null>() // newest sesh per friend+movie in this state
  for (const s of rows) {
    const k = `${s.tmdb_id}:${s.user_id}`
    if (s.influence === tab && listed.has(s.tmdb_id) && !latest.has(k)) latest.set(k, s.recommend)
  }
  const fv = new Map<number, { recommend: number; total: number }>()
  for (const [k, rec] of latest) {
    const id = Number(k.split(':')[0])
    const v = fv.get(id) ?? { recommend: 0, total: 0 }
    v.total++
    if (rec) v.recommend++
    fv.set(id, v)
  }

  const rowsOut: DiscoverRow[] = ranked.map((r) => ({
    movie: movieOf(movies.get(r.tmdbId)!), genre: movies.get(r.tmdbId)!.genres?.[0] ?? null,
    logCount: r.logCount, recommendPct: r.recommendPct!, friends: fv.get(r.tmdbId) ?? null,
  }))

  const byMovie = new Map<number, Set<string>>()
  for (const s of rows) {
    if (s.created_at < since) continue
    byMovie.set(s.tmdb_id, (byMovie.get(s.tmdb_id) ?? new Set()).add(s.user_id))
  }
  const trending: Trending[] = [...byMovie]
    .filter(([id]) => movies.has(id))
    .map(([id, u]) => ({ movie: movieOf(movies.get(id)!), friendCount: u.size }))
    .sort((a, b) => b.friendCount - a.friendCount)
    .slice(0, 8)

  return { rows: rowsOut, trending, genres }
}
