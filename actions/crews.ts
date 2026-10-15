'use server'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { orderedPair } from '@/lib/friends'

type Result = { ok: boolean; error?: string; id?: string }
const FAIL: Result = { ok: false, error: 'Something went wrong. Try again.' }
const SIGNED_OUT: Result = { ok: false, error: 'You are signed out. Sign in again.' }

async function me() {
  const supabase = await createServerClient()
  const { data } = await supabase.auth.getUser()
  return { supabase, id: data.user?.id }
}
const ownerMsg = (m: string): Result => (m.includes('crew must keep an owner') ? { ok: false, error: 'A crew needs at least one owner.' } : FAIL)

export async function createCrew(name: string): Promise<Result> {
  const clean = name.trim()
  if (!clean || clean.length > 40) return { ok: false, error: 'Name your crew (up to 40 characters).' }
  const { supabase, id } = await me()
  if (!id) return SIGNED_OUT
  const { data, error } = await supabase.from('crews').insert({ name: clean, created_by: id }).select('id').single()
  if (error) return FAIL
  const { error: e2 } = await supabase.from('crew_members').insert({ crew_id: data.id, user_id: id, role: 'owner' })
  if (e2) return FAIL
  revalidatePath('/crews')
  return { ok: true, id: data.id }
}

export async function addCrewMember(crewId: string, userId: string): Promise<Result> {
  const { supabase, id } = await me()
  if (!id) return SIGNED_OUT
  const { error } = await supabase.from('crew_members').insert({ crew_id: crewId, user_id: userId, role: 'member' })
  if (error) return error.code === '23505' ? { ok: true } : FAIL
  revalidatePath(`/crews/${crewId}`)
  return { ok: true }
}

export async function addCrewMemberByUsername(crewId: string, username: string): Promise<Result> {
  const { supabase, id } = await me()
  if (!id) return SIGNED_OUT
  const { data: p } = await supabase.from('profiles').select('id').eq('username', username.trim().replace(/^@/, '')).maybeSingle()
  if (!p) return { ok: false, error: 'No one with that username.' }
  const [user_a, user_b] = orderedPair(id, p.id)
  const { data: f } = await supabase.from('friendships').select('status').eq('user_a', user_a).eq('user_b', user_b).eq('status', 'accepted').maybeSingle()
  if (!f) return { ok: false, error: 'You can only add friends to a crew.' }
  return addCrewMember(crewId, p.id)
}

export async function removeCrewMember(crewId: string, userId: string): Promise<Result> {
  const { supabase, id } = await me()
  if (!id) return SIGNED_OUT
  const { error } = await supabase.from('crew_members').delete().eq('crew_id', crewId).eq('user_id', userId)
  if (error) return ownerMsg(error.message)
  revalidatePath(`/crews/${crewId}`)
  revalidatePath('/crews')
  return { ok: true }
}

export async function leaveCrew(crewId: string): Promise<Result> {
  const { id } = await me()
  if (!id) return SIGNED_OUT
  return removeCrewMember(crewId, id)
}
