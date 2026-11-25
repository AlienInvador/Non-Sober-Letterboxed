import 'server-only'
import { createServerClient } from '@/lib/supabase/server'
import { COMPANIONS, acceptedNames, peopleFilter, type FeedItem } from '@/lib/queries/feed'
import { SUBJECT, subjectOf, type PlaceSummary } from '@/lib/subject'
import type { InfluenceStat } from '@/lib/queries/movie'
import type { Influence } from '@/lib/influence'

type ProfRow = { id: string; username: string; display_name: string | null; avatar_url: string | null }

export async function getPlace(id: string): Promise<{ me: string; place: PlaceSummary; stats: InfluenceStat[]; seshes: FeedItem[] } | null> {
  const sb = await createServerClient()
  const { data: auth } = await sb.auth.getUser()
  const me = auth.user?.id
  if (!me) throw new Error('not signed in')

  const { data: p, error } = await sb.from('places').select('id, name, category').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  if (!p) return null

  const [statsRes, sessRes] = await Promise.all([
    sb.from('place_influence_stats').select('influence, log_count, recommend_pct').eq('place_id', id),
    // RLS decides what is readable; the filter only narrows to me + friends + crew, like the feed.
    sb.from('sessions')
      .select(`id, influence, recommend, review, watched_on, created_at, profiles!sessions_user_id_fkey(id, username, display_name, avatar_url), ${SUBJECT}, cheers(user_id), ${COMPANIONS}`)
      .eq('place_id', id).or(await peopleFilter(sb, me)).order('created_at', { ascending: false }).limit(50),
  ])
  for (const r of [statsRes, sessRes]) if (r.error) throw new Error(r.error.message)

  const stats: InfluenceStat[] = (statsRes.data ?? []).map((r) => ({
    influence: r.influence as Influence, logCount: Number(r.log_count), recommendPct: r.recommend_pct === null ? null : Number(r.recommend_pct),
  }))
  const seshes = (sessRes.data ?? []).flatMap((r): FeedItem[] => {
    const pr = r.profiles as unknown as ProfRow | null
    const subject = subjectOf(r)
    if (!pr || !subject) return []
    const cheers = (r.cheers ?? []) as { user_id: string }[]
    return [{
      id: r.id, profile: { id: pr.id, username: pr.username, displayName: pr.display_name, avatarUrl: pr.avatar_url },
      subject, influence: r.influence as Influence, recommend: r.recommend, review: r.review, watchedOn: r.watched_on,
      createdAt: r.created_at as string, cursor: '', withNames: acceptedNames(r.session_companions),
      cheers: cheers.length, cheeredByMe: cheers.some((c) => c.user_id === me),
    }]
  })
  return { me, place: { id: p.id, name: p.name, category: p.category }, stats, seshes }
}
