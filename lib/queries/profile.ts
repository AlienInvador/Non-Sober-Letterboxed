import 'server-only'
import { createServerClient } from '@/lib/supabase/server'
import { orderedPair, escapeLike } from '@/lib/friends'
import type { Influence } from '@/lib/influence'
import type { FeedItem } from '@/lib/queries/feed'
import { influenceBreakdown, monthLabel } from '@/lib/profile-stats'

export { influenceBreakdown }
export type FriendStatus = 'self' | 'none' | 'friends' | 'sent' | 'incoming'
export type ProfileData = {
  profile: { id: string; username: string; displayName: string | null; avatarUrl: string | null }
  status: FriendStatus
  total: number
  breakdown: Record<Influence, number>
  months: { label: string; items: FeedItem[] }[]
  lists: { id: string; title: string; count: number }[]
}

type MovieRow = { tmdb_id: number; title: string; year: number | null; poster_path: string | null }

export async function getProfile(username: string): Promise<ProfileData | null> {
  const sb = await createServerClient()
  const { data: auth } = await sb.auth.getUser()
  const me = auth.user?.id
  if (!me) throw new Error('not signed in')

  const { data: p, error } = await sb.from('profiles').select('id, username, display_name, avatar_url').ilike('username', escapeLike(username)).maybeSingle()
  if (error) throw new Error(error.message)
  if (!p) return null

  const [a, b] = orderedPair(me, p.id)
  const [sessRes, listRes, frRes] = await Promise.all([
    // RLS decides which of their seshes I can read
    sb.from('sessions')
      .select('id, influence, recommend, review, watched_on, created_at, movies(tmdb_id, title, year, poster_path), cheers(user_id)')
      .eq('user_id', p.id).order('watched_on', { ascending: false }).order('created_at', { ascending: false }).limit(200),
    sb.from('lists').select('id, title, list_items(count)').eq('owner_id', p.id).order('title'),
    sb.from('friendships').select('status, requested_by').eq('user_a', a).eq('user_b', b).maybeSingle(),
  ])
  for (const r of [sessRes, listRes, frRes]) if (r.error) throw new Error(r.error.message)

  const profile = { id: p.id, username: p.username, displayName: p.display_name, avatarUrl: p.avatar_url }
  const items: FeedItem[] = (sessRes.data ?? []).flatMap((r) => {
    const m = r.movies as unknown as MovieRow | null
    if (!m) return []
    const cheers = (r.cheers ?? []) as { user_id: string }[]
    return [{
      id: r.id, profile, movie: { tmdbId: m.tmdb_id, title: m.title, year: m.year, posterPath: m.poster_path },
      influence: r.influence as Influence, recommend: r.recommend, review: r.review, watchedOn: r.watched_on,
      createdAt: r.created_at as string, cursor: '', cheers: cheers.length, cheeredByMe: cheers.some((c) => c.user_id === me),
    }]
  })
  const months: ProfileData['months'] = []
  for (const it of items) {
    const label = monthLabel(it.watchedOn)
    const last = months[months.length - 1]
    if (last?.label === label) last.items.push(it)
    else months.push({ label, items: [it] })
  }

  const f = frRes.data
  const status: FriendStatus = p.id === me ? 'self' : !f ? 'none' : f.status === 'accepted' ? 'friends' : f.requested_by === me ? 'sent' : 'incoming'
  const lists = (listRes.data ?? []).map((l) => ({
    id: l.id, title: l.title, count: (l.list_items as unknown as { count: number }[])?.[0]?.count ?? 0,
  }))
  return { profile, status, total: items.length, breakdown: influenceBreakdown(items), months, lists }
}
