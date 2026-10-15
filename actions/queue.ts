'use server'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { ensureMovieCached } from '@/lib/movies'

export type QueueResult = { ok: true; queued: boolean } | { ok: false; error: string }
const FAIL = { ok: false, error: 'Something went wrong. Try again.' } as const

async function me() {
  const supabase = await createServerClient()
  const { data } = await supabase.auth.getUser()
  return { supabase, id: data.user?.id }
}

export async function toggleQueue(tmdbId: number): Promise<QueueResult> {
  if (!Number.isInteger(tmdbId) || tmdbId <= 0) return FAIL
  const { supabase, id } = await me()
  if (!id) return { ok: false, error: 'You are signed out. Sign in again.' }
  const { data: existing, error: e1 } = await supabase.from('queue').select('tmdb_id').eq('user_id', id).eq('tmdb_id', tmdbId).maybeSingle()
  if (e1) return FAIL
  if (existing) {
    const { error } = await supabase.from('queue').delete().eq('user_id', id).eq('tmdb_id', tmdbId)
    if (error) return FAIL
  } else {
    try { await ensureMovieCached(tmdbId) } catch { return { ok: false, error: 'Could not reach the movie database. Try again.' } }
    const { error } = await supabase.from('queue').insert({ user_id: id, tmdb_id: tmdbId })
    if (error && error.code !== '23505') return FAIL
  }
  revalidatePath('/queue')
  revalidatePath('/')
  return { ok: true, queued: !existing }
}

export async function removeFromQueue(tmdbId: number): Promise<{ ok: boolean; error?: string }> {
  const { supabase, id } = await me()
  if (!id) return { ok: false, error: 'You are signed out. Sign in again.' }
  const { error } = await supabase.from('queue').delete().eq('user_id', id).eq('tmdb_id', tmdbId)
  if (error) return FAIL
  revalidatePath('/queue')
  revalidatePath('/')
  return { ok: true }
}
