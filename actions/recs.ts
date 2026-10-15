'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { ensureMovieCached } from '@/lib/movies'

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string }
const SIGNED_OUT = { ok: false, error: 'You are signed out. Sign in again.' } as const

const recInput = z
  .object({
    tmdbId: z.number().int().positive(),
    influence: z.enum(['drunk', 'high', 'both']),
    note: z.string().trim().max(140, 'Keep the note to 140 characters.').optional(),
    toUserIds: z.array(z.uuid()).max(20).default([]),
    crewId: z.uuid().optional(),
    sessionId: z.uuid().optional(),
  })
  .refine((r) => r.toUserIds.length > 0 || !!r.crewId, { message: 'Pick at least one friend or a crew.' })

export async function sendRec(input: z.input<typeof recInput>): Promise<Result<{ count: number }>> {
  const parsed = recInput.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check your picks and try again.' }
  const r = parsed.data
  const supabase = await createServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return SIGNED_OUT

  try {
    await ensureMovieCached(r.tmdbId)
  } catch {
    return { ok: false, error: 'Could not reach the movie database. Try again.' }
  }

  const base = { from_user: auth.user.id, tmdb_id: r.tmdbId, influence: r.influence, note: r.note || null, session_id: r.sessionId ?? null }
  const rows = [
    ...[...new Set(r.toUserIds)].map((to_user) => ({ ...base, to_user, crew_id: null })),
    ...(r.crewId ? [{ ...base, to_user: null, crew_id: r.crewId }] : []),
  ]
  const { error } = await supabase.from('recommendations').insert(rows)
  if (error) {
    return error.code === '42501'
      ? { ok: false, error: 'You can only send recs to friends and your crews.' }
      : { ok: false, error: 'Could not send that rec. Try again.' }
  }
  revalidatePath('/')
  return { ok: true, count: rows.length }
}

export async function dismissRec(id: string): Promise<Result> {
  if (!z.uuid().safeParse(id).success) return { ok: false, error: 'Could not dismiss that rec.' }
  const supabase = await createServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return SIGNED_OUT
  const { error } = await supabase.from('recommendations').update({ dismissed_at: new Date().toISOString() }).eq('id', id).eq('to_user', auth.user.id)
  if (error) return { ok: false, error: 'Could not dismiss that rec.' }
  revalidatePath('/')
  return { ok: true }
}
