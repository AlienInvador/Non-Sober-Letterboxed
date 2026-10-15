import 'server-only'
import { createServerClient } from '@/lib/supabase/server'
import type { MovieSummary } from '@/lib/tmdb'
import type { ProfileLite } from '@/lib/queries/movie'

export type CrewMember = { profile: ProfileLite; role: 'owner' | 'member' }
export type TopPick = { movie: MovieSummary; count: number }

async function ctx() {
  const sb = await createServerClient()
  const { data } = await sb.auth.getUser()
  if (!data.user) throw new Error('not signed in')
  return { sb, me: data.user.id }
}

export async function getMyCrews(): Promise<{ id: string; name: string }[]> {
  const { sb, me } = await ctx()
  const { data, error } = await sb.from('crew_members').select('crews(id, name)').eq('user_id', me)
  if (error) throw new Error(error.message)
  return (data ?? []).flatMap((r) => (r.crews ? [r.crews as unknown as { id: string; name: string }] : []))
}

export async function getCrewPage(crewId: string) {
  const { sb, me } = await ctx()
  const { data: crew } = await sb.from('crews').select('id, name').eq('id', crewId).maybeSingle()
  if (!crew) return null
  const [mem, picks] = await Promise.all([
    sb.from('crew_members').select('role, profiles(id, username, display_name, avatar_url)').eq('crew_id', crewId),
    sb.from('sessions').select('tmdb_id, movies(tmdb_id, title, year, poster_path)').eq('crew_id', crewId).eq('recommend', true).limit(200),
  ])
  for (const r of [mem, picks]) if (r.error) throw new Error(r.error.message)
  const members: CrewMember[] = (mem.data ?? []).flatMap((r) => {
    const p = r.profiles as unknown as { id: string; username: string; display_name: string | null; avatar_url: string | null } | null
    return p ? [{ role: r.role as CrewMember['role'], profile: { id: p.id, username: p.username, displayName: p.display_name, avatarUrl: p.avatar_url } }] : []
  })
  const byMovie = new Map<number, TopPick>()
  for (const r of picks.data ?? []) {
    const m = r.movies as unknown as { tmdb_id: number; title: string; year: number | null; poster_path: string | null } | null
    if (!m) continue
    const cur = byMovie.get(m.tmdb_id) ?? { movie: { tmdbId: m.tmdb_id, title: m.title, year: m.year, posterPath: m.poster_path }, count: 0 }
    cur.count++
    byMovie.set(m.tmdb_id, cur)
  }
  const topPicks = [...byMovie.values()].sort((a, b) => b.count - a.count).slice(0, 5)
  return { crew, members, topPicks, isOwner: members.some((m) => m.profile.id === me && m.role === 'owner'), me }
}
