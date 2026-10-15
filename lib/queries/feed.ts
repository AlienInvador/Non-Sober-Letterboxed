import 'server-only'
import { createServerClient } from '@/lib/supabase/server'
import type { Influence } from '@/lib/influence'
import type { MovieSummary } from '@/lib/tmdb'
import type { ProfileLite } from '@/lib/queries/movie'

export type FeedItem = {
  id: string; profile: ProfileLite; movie: MovieSummary; influence: Influence; rating: number | null
  recommend: boolean | null; review: string | null; watchedOn: string; cheers: number; cheeredByMe: boolean; createdAt: string
}

type MovieRow = { tmdb_id: number; title: string; year: number | null; poster_path: string | null }
type ProfRow = { id: string; username: string; display_name: string | null; avatar_url: string | null }
const MOVIE = 'tmdb_id, title, year, poster_path'
const movieOf = (m: MovieRow): MovieSummary => ({ tmdbId: m.tmdb_id, title: m.title, year: m.year, posterPath: m.poster_path })

async function ctx() {
  const sb = await createServerClient()
  const { data } = await sb.auth.getUser()
  if (!data.user) throw new Error('not signed in')
  return { sb, me: data.user.id }
}

// RLS decides what is readable; this only narrows (me + friends + crew seshes) so strangers' public seshes stay out.
async function peopleFilter(sb: Awaited<ReturnType<typeof createServerClient>>, me: string) {
  const { data, error } = await sb.from('friendships').select('user_a, user_b').eq('status', 'accepted').or(`user_a.eq.${me},user_b.eq.${me}`)
  if (error) throw new Error(error.message)
  const ids = [me, ...(data ?? []).map((f) => (f.user_a === me ? f.user_b : f.user_a))]
  return `user_id.in.(${ids.join(',')}),visibility.eq.crew`
}

export async function getFeed(opts: { crewId?: string; before?: string; limit?: number } = {}): Promise<FeedItem[]> {
  const { sb, me } = await ctx()
  let q = sb
    .from('sessions')
    .select(`id, influence, rating, recommend, review, watched_on, created_at, profiles!sessions_user_id_fkey(id, username, display_name, avatar_url), movies(${MOVIE}), cheers(user_id)`)
    .order('created_at', { ascending: false })
    .limit(opts.limit ?? 20)
  q = opts.crewId ? q.eq('crew_id', opts.crewId) : q.or(await peopleFilter(sb, me))
  if (opts.before) q = q.lt('created_at', opts.before)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data ?? []).flatMap((r) => {
    const p = r.profiles as unknown as ProfRow | null
    const m = r.movies as unknown as MovieRow | null
    if (!p || !m) return []
    const cheers = (r.cheers ?? []) as { user_id: string }[]
    return [{
      id: r.id, profile: { id: p.id, username: p.username, displayName: p.display_name, avatarUrl: p.avatar_url },
      movie: movieOf(m), influence: r.influence as Influence, rating: r.rating === null ? null : Number(r.rating),
      recommend: r.recommend, review: r.review, watchedOn: r.watched_on, createdAt: r.created_at as string,
      cheers: cheers.length, cheeredByMe: cheers.some((c) => c.user_id === me),
    }]
  })
}

// Queue ∩ recommended seshes from my people, max 10.
export async function getHittingTonight(): Promise<MovieSummary[]> {
  const { sb, me } = await ctx()
  const { data: queue, error } = await sb.from('queue').select('tmdb_id').eq('user_id', me)
  if (error) throw new Error(error.message)
  const ids = (queue ?? []).map((r) => r.tmdb_id)
  if (!ids.length) return []
  const { data, error: e2 } = await sb
    .from('sessions').select(`tmdb_id, movies(${MOVIE})`).eq('recommend', true).in('tmdb_id', ids)
    .or(await peopleFilter(sb, me)).order('created_at', { ascending: false }).limit(50)
  if (e2) throw new Error(e2.message)
  const seen = new Map<number, MovieSummary>()
  for (const r of data ?? []) {
    const m = r.movies as unknown as MovieRow | null
    if (m && !seen.has(m.tmdb_id)) seen.set(m.tmdb_id, movieOf(m))
  }
  return [...seen.values()].slice(0, 10)
}

export type Hero = { movie: MovieSummary; backdropPath: string | null; eyebrow: string; influence: Influence; pct: number | null }

export async function getHero(hitting: MovieSummary[]): Promise<Hero | null> {
  const { sb, me } = await ctx()
  const { data, error } = await sb
    .from('sessions').select('tmdb_id, influence, crews(name)').eq('recommend', true)
    .or(await peopleFilter(sb, me)).order('created_at', { ascending: false }).limit(50)
  if (error) throw new Error(error.message)
  const rows = data ?? []
  let pick = hitting[0]?.tmdbId
  if (pick === undefined) {
    const n = new Map<number, number>()
    for (const r of rows) n.set(r.tmdb_id, (n.get(r.tmdb_id) ?? 0) + 1)
    pick = [...n].sort((a, b) => b[1] - a[1])[0]?.[0]
  }
  if (pick === undefined) return null
  const mine = rows.find((r) => r.tmdb_id === pick)
  const [{ data: m }, { data: st }] = await Promise.all([
    sb.from('movies').select(`${MOVIE}, backdrop_path`).eq('tmdb_id', pick).maybeSingle(),
    sb.from('movie_influence_stats').select('influence, recommend_pct').eq('tmdb_id', pick),
  ])
  if (!m) return null
  const influence = (mine?.influence ?? 'both') as Influence
  const crew = (mine?.crews as unknown as { name: string } | null)?.name
  const pct = st?.find((s) => s.influence === influence)?.recommend_pct
  return {
    movie: movieOf(m), backdropPath: m.backdrop_path, influence,
    eyebrow: crew ? `${crew}'s pick tonight` : 'your people’s pick tonight',
    pct: pct === null || pct === undefined ? null : Number(pct),
  }
}

export type QueueItem = { movie: MovieSummary; influence: Influence | null; pct: number | null }

export async function getQueue(): Promise<QueueItem[]> {
  const { sb, me } = await ctx()
  const { data, error } = await sb
    .from('queue').select(`movies(${MOVIE})`).eq('user_id', me).order('added_at', { ascending: false }).limit(20)
  if (error) throw new Error(error.message)
  const movies = (data ?? []).flatMap((r) => (r.movies ? [movieOf(r.movies as unknown as MovieRow)] : []))
  if (!movies.length) return []
  const { data: st } = await sb
    .from('movie_influence_stats').select('tmdb_id, influence, log_count, recommend_pct').in('tmdb_id', movies.map((m) => m.tmdbId))
  return movies.map((movie) => {
    const best = (st ?? []).filter((s) => s.tmdb_id === movie.tmdbId && s.recommend_pct !== null)
      .sort((a, b) => Number(b.log_count) - Number(a.log_count))[0]
    return { movie, influence: (best?.influence as Influence) ?? null, pct: best ? Number(best.recommend_pct) : null }
  })
}
