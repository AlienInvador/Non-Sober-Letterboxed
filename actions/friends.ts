'use server'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { orderedPair, escapeLike } from '@/lib/friends'

type Result = { ok: boolean; error?: string }
const FAIL = { ok: false, error: 'Something went wrong. Try again.' }
const SIGNED_OUT = { ok: false, error: 'You are signed out. Sign in again.' }

async function me() {
  const supabase = await createServerClient()
  const { data } = await supabase.auth.getUser()
  return { supabase, id: data.user?.id }
}

export async function requestFriend(userId: string): Promise<Result> {
  const { supabase, id } = await me()
  if (!id) return SIGNED_OUT
  if (userId === id) return { ok: false, error: 'self' }
  const [user_a, user_b] = orderedPair(id, userId)
  const { data: existing } = await supabase
    .from('friendships').select('status, requested_by').eq('user_a', user_a).eq('user_b', user_b).maybeSingle()
  if (existing?.status === 'accepted' || existing?.requested_by === id) return { ok: true }
  if (existing) return acceptFriend(userId) // they already asked me
  const { error } = await supabase.from('friendships').insert({ user_a, user_b, status: 'pending', requested_by: id })
  if (error) return FAIL
  revalidatePath('/friends')
  return { ok: true }
}

export async function acceptFriend(userId: string): Promise<Result> {
  const { supabase, id } = await me()
  if (!id) return SIGNED_OUT
  const [user_a, user_b] = orderedPair(id, userId)
  const { error } = await supabase.from('friendships').update({ status: 'accepted' }).eq('user_a', user_a).eq('user_b', user_b)
  if (error) return FAIL
  revalidatePath('/friends')
  return { ok: true }
}

// Also cancels a sent request or declines an incoming one.
export async function removeFriend(userId: string): Promise<Result> {
  const { supabase, id } = await me()
  if (!id) return SIGNED_OUT
  const [user_a, user_b] = orderedPair(id, userId)
  const { error } = await supabase.from('friendships').delete().eq('user_a', user_a).eq('user_b', user_b)
  if (error) return FAIL
  revalidatePath('/friends')
  return { ok: true }
}

export type FriendProfile = { id: string; username: string; display_name: string | null; avatar_url: string | null }
export type Relation = 'none' | 'friends' | 'sent' | 'incoming'
const COLS = 'id, username, display_name, avatar_url'

export async function searchUsers(q: string): Promise<(FriendProfile & { relation: Relation })[]> {
  const prefix = q.trim().replace(/^@/, '')
  if (!prefix) return []
  const { supabase, id } = await me()
  if (!id) return []
  const { data } = await supabase
    .from('profiles').select(COLS).ilike('username', `${escapeLike(prefix)}%`).neq('id', id).limit(10)
  const { data: fr } = await supabase
    .from('friendships').select('user_a, user_b, status, requested_by').or(`user_a.eq.${id},user_b.eq.${id}`)
  const rel = (pid: string): Relation => {
    const f = (fr ?? []).find((x) => x.user_a === pid || x.user_b === pid)
    return !f ? 'none' : f.status === 'accepted' ? 'friends' : f.requested_by === id ? 'sent' : 'incoming'
  }
  return (data ?? []).map((p) => ({ ...p, relation: rel(p.id) }))
}

export async function getFriendsData() {
  const { supabase, id } = await me()
  if (!id) return null
  const { data: fr } = await supabase
    .from('friendships').select('user_a, user_b, status, requested_by').or(`user_a.eq.${id},user_b.eq.${id}`)
  const rows = (fr ?? []).map((f) => ({ other: f.user_a === id ? f.user_b : f.user_a, status: f.status, by: f.requested_by }))
  const ids = rows.map((r) => r.other)
  const { data: profs } = ids.length ? await supabase.from('profiles').select(COLS).in('id', ids) : { data: [] }
  const { data: mine } = await supabase.from('profiles').select('username').eq('id', id).single()
  const prof = new Map((profs ?? []).map((p) => [p.id, p]))
  const pick = (f: (r: (typeof rows)[number]) => boolean) =>
    rows.filter(f).flatMap((r) => (prof.has(r.other) ? [prof.get(r.other)!] : []))
  return {
    username: mine?.username ?? '',
    friends: pick((r) => r.status === 'accepted'),
    incoming: pick((r) => r.status === 'pending' && r.by !== id),
    sent: pick((r) => r.status === 'pending' && r.by === id),
  }
}
