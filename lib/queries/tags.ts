import 'server-only'
import { createServerClient } from '@/lib/supabase/server'
import { posterUrl } from '@/lib/tmdb'
import { SUBJECT, subjectOf, type Subject } from '@/lib/subject'

export type TagItem = {
  sessionId: string; subject: Subject; poster: string | null; watchedOn: string
  taggerId: string; taggerUsername: string; taggerName: string; taggerIsFriend: boolean
}
type SessionRow = {
  watched_on: string; user_id: string
  movies: unknown; places: unknown; profiles: { username: string; display_name: string | null } | null
}

// Pending tags on other people's seshes. RLS lets the tagged user read the session.
export async function getTagsForMe(limit = 10): Promise<TagItem[]> {
  const sb = await createServerClient()
  const { data: auth } = await sb.auth.getUser()
  const me = auth.user?.id
  if (!me) throw new Error('not signed in')
  const { data, error } = await sb
    .from('session_companions')
    .select(`session_id, sessions!session_companions_session_id_fkey(created_at, watched_on, user_id, ${SUBJECT}, profiles!sessions_user_id_fkey(username, display_name))`)
    .eq('user_id', me).eq('status', 'pending')
    .order('sessions(created_at)', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  const { data: fr, error: fErr } = await sb
    .from('friendships').select('user_a, user_b').eq('status', 'accepted').or(`user_a.eq.${me},user_b.eq.${me}`)
  if (fErr) throw new Error(fErr.message)
  const friends = new Set((fr ?? []).map((f) => (f.user_a === me ? f.user_b : f.user_a)))
  return (data ?? []).flatMap((r) => {
    const s = r.sessions as unknown as SessionRow | null
    const subject = s && subjectOf(s)
    if (!s || !subject || !s.profiles) return []
    return [{
      sessionId: r.session_id, watchedOn: s.watched_on, poster: subject.kind === 'movie' ? posterUrl(subject.movie.posterPath, 'w185') : null,
      subject,
      taggerId: s.user_id, taggerUsername: s.profiles.username, taggerName: s.profiles.display_name || s.profiles.username,
      taggerIsFriend: friends.has(s.user_id),
    }]
  })
}
