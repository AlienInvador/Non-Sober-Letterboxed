'use server'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { ensureMovieCached } from '@/lib/movies'
import { sessionInput, type SessionInput } from '@/lib/session-schema'

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string }
const FAIL = { ok: false, error: 'Could not save your sesh. Check your picks and try again.' } as const

export async function createSession(input: SessionInput): Promise<Result<{ id: string }>> {
  const parsed = sessionInput.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? FAIL.error }
  const s = parsed.data
  const supabase = await createServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return { ok: false, error: 'You are signed out. Sign in again.' }

  try {
    await ensureMovieCached(s.tmdbId)
  } catch {
    return { ok: false, error: 'Could not reach the movie database. Try again.' }
  }

  const { data, error } = await supabase
    .from('sessions')
    .insert({
      user_id: auth.user.id, tmdb_id: s.tmdbId, watched_on: s.watchedOn, influence: s.influence,
      rating: s.rating, recommend: s.recommend, review: s.review?.trim() || null,
      visibility: s.visibility, crew_id: s.crewId, rewatch: s.rewatch,
    })
    .select('id')
    .single()
  if (error || !data) return FAIL

  if (s.companionIds.length) {
    const { error: cErr } = await supabase
      .from('session_companions')
      .insert(s.companionIds.map((user_id) => ({ session_id: data.id, user_id })))
    if (cErr) {
      await supabase.from('sessions').delete().eq('id', data.id)
      return FAIL
    }
  }
  revalidatePath('/')
  return { ok: true, id: data.id }
}

export async function deleteSession(id: string): Promise<Result> {
  const supabase = await createServerClient()
  const { error } = await supabase.from('sessions').delete().eq('id', id)
  if (error) return { ok: false, error: 'Could not delete that sesh.' }
  revalidatePath('/')
  return { ok: true }
}

export type LogContext = { friends: { id: string; name: string }[]; crews: { id: string; name: string }[] }

// Accepted friends + the user's crews, for the sheet's "More" section.
export async function getLogContext(): Promise<LogContext> {
  const supabase = await createServerClient()
  const { data: auth } = await supabase.auth.getUser()
  const me = auth.user?.id
  if (!me) return { friends: [], crews: [] }
  const { data: fr } = await supabase
    .from('friendships').select('user_a, user_b').eq('status', 'accepted').or(`user_a.eq.${me},user_b.eq.${me}`)
  const ids = (fr ?? []).map((f) => (f.user_a === me ? f.user_b : f.user_a))
  const { data: profs } = ids.length
    ? await supabase.from('profiles').select('id, username, display_name').in('id', ids)
    : { data: [] }
  const { data: cm } = await supabase.from('crew_members').select('crews(id, name)').eq('user_id', me)
  return {
    friends: (profs ?? []).map((p) => ({ id: p.id, name: p.display_name || p.username })),
    crews: (cm ?? []).flatMap((c) => (c.crews ? [c.crews as unknown as { id: string; name: string }] : [])),
  }
}
