'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
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
      recommend: s.recommend, review: s.review?.trim() || null,
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
  if (s.fromTagSessionId) {
    // best effort: the sesh is saved either way; a stale tag just stays pending
    await supabase.from('session_companions').update({ status: 'accepted', own_session_id: data.id })
      .eq('user_id', auth.user.id).eq('session_id', s.fromTagSessionId).eq('status', 'pending')
  }
  revalidatePath('/')
  return { ok: true, id: data.id }
}

const sessionId = z.uuid()

export async function deleteSession(id: string): Promise<Result> {
  if (!sessionId.safeParse(id).success) return { ok: false, error: 'Could not delete that sesh.' }
  const supabase = await createServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return { ok: false, error: 'You are signed out. Sign in again.' }
  // RLS only lets the owner delete; an empty result means not found or not yours
  const { data, error } = await supabase.from('sessions').delete().eq('id', id).select('id')
  if (error || !data?.length) return { ok: false, error: 'Could not delete that sesh.' }
  revalidatePath('/')
  revalidatePath('/discover')
  revalidatePath('/u/[username]', 'page')
  revalidatePath('/crews/[id]', 'page')
  revalidatePath('/movie/[tmdbId]', 'page')
  return { ok: true }
}

export type LogContext = { friends: { id: string; name: string; username: string; avatarUrl: string | null }[]; crews: { id: string; name: string }[] }

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
    ? await supabase.from('profiles').select('id, username, display_name, avatar_url').in('id', ids)
    : { data: [] }
  const { data: cm } = await supabase.from('crew_members').select('crews(id, name)').eq('user_id', me)
  return {
    friends: (profs ?? []).map((p) => ({ id: p.id, name: p.display_name || p.username, username: p.username, avatarUrl: p.avatar_url })),
    crews: (cm ?? []).flatMap((c) => (c.crews ? [c.crews as unknown as { id: string; name: string }] : [])),
  }
}
