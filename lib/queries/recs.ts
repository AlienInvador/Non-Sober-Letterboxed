import 'server-only'
import { createServerClient } from '@/lib/supabase/server'
import type { Influence } from '@/lib/influence'
import { posterUrl, type MovieSummary } from '@/lib/tmdb'

export type RecItem = { id: string; from: string; movie: MovieSummary; influence: Influence; note: string | null; poster: string | null; dismissible: boolean }
type MovieRow = { tmdb_id: number; title: string; year: number | null; poster_path: string | null }

// Undismissed recs sent to me or my crews. RLS scopes rows to sender / recipient / crew members.
export async function getRecsForMe(limit = 10): Promise<RecItem[]> {
  const sb = await createServerClient()
  const { data: auth } = await sb.auth.getUser()
  const me = auth.user?.id
  if (!me) throw new Error('not signed in')
  const { data, error } = await sb
    .from('recommendations')
    .select('id, to_user, influence, note, profiles!recommendations_from_user_fkey(username), movies(tmdb_id, title, year, poster_path)')
    .neq('from_user', me).is('dismissed_at', null)
    .order('created_at', { ascending: false }).limit(limit)
  if (error) throw new Error(error.message)
  return (data ?? []).flatMap((r) => {
    const p = r.profiles as unknown as { username: string } | null
    const m = r.movies as unknown as MovieRow | null
    if (!p || !m) return []
    return [{
      id: r.id, from: p.username, poster: posterUrl(m.poster_path, 'w185'), influence: r.influence as Influence, note: r.note,
      movie: { tmdbId: m.tmdb_id, title: m.title, year: m.year, posterPath: m.poster_path },
      dismissible: r.to_user === me, // v1: crew recs have no per-member dismissal
    }]
  })
}
