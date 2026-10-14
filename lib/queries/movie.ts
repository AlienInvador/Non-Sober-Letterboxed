import 'server-only'
import { createServerClient } from '@/lib/supabase/server'
import { ensureMovieCached } from '@/lib/movies'
import type { Movie } from '@/lib/tmdb'
import type { Influence } from '@/lib/influence'

export type InfluenceStat = { influence: Influence; logCount: number; avgRating: number | null; recommendPct: number | null }
export type ProfileLite = { id: string; username: string; displayName: string | null; avatarUrl: string | null }
export type PublicReview = { id: string; profile: ProfileLite; influence: Influence; rating: number | null; review: string; watchedOn: string }
export type FriendWatch = { profile: ProfileLite; influence: Influence; rating: number | null }

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v))

export async function getMoviePage(tmdbId: number) {
  const movie: Movie = await ensureMovieCached(tmdbId)
  const sb = await createServerClient()
  const { data: auth } = await sb.auth.getUser()
  const me = auth.user?.id

  const [statsRes, sessRes, frRes] = await Promise.all([
    sb.from('movie_influence_stats').select('influence, log_count, avg_rating, recommend_pct').eq('tmdb_id', tmdbId),
    sb.from('sessions').select('id, user_id, influence, rating, review, visibility, watched_on')
      .eq('tmdb_id', tmdbId).order('watched_on', { ascending: false }).limit(100),
    sb.from('friendships').select('user_a, user_b').eq('status', 'accepted'),
  ])

  const stats: InfluenceStat[] = (statsRes.data ?? []).map((r) => ({
    influence: r.influence, logCount: Number(r.log_count), avgRating: num(r.avg_rating), recommendPct: num(r.recommend_pct),
  }))

  const friendIds = new Set((frRes.data ?? []).flatMap((f) => [f.user_a, f.user_b]).filter((id) => id !== me))
  const sessions = (sessRes.data ?? []).filter((s) => s.user_id !== me)
  const ids = [...new Set(sessions.map((s) => s.user_id))]
  const { data: profs } = ids.length
    ? await sb.from('profiles').select('id, username, display_name, avatar_url').in('id', ids)
    : { data: [] }
  const byId = new Map<string, ProfileLite>(
    (profs ?? []).map((p) => [p.id, { id: p.id, username: p.username, displayName: p.display_name, avatarUrl: p.avatar_url }]),
  )

  const seen = new Set<string>()
  const friends: FriendWatch[] = []
  const reviews: PublicReview[] = []
  for (const s of sessions) {
    const profile = byId.get(s.user_id)
    if (!profile) continue
    if (friendIds.has(s.user_id) && !seen.has(s.user_id)) {
      seen.add(s.user_id)
      friends.push({ profile, influence: s.influence, rating: num(s.rating) })
    }
    if (s.visibility === 'public' && s.review?.trim()) {
      reviews.push({ id: s.id, profile, influence: s.influence, rating: num(s.rating), review: s.review, watchedOn: s.watched_on })
    }
  }
  return { movie, stats, friends, reviews }
}
