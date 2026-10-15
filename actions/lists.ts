'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { ensureMovieCached } from '@/lib/movies'

type Result = { ok: boolean; error?: string; id?: string }
const FAIL: Result = { ok: false, error: 'Something went wrong. Try again.' }
const SIGNED_OUT: Result = { ok: false, error: 'You are signed out. Sign in again.' }

const listInput = z.object({
  title: z.string().trim().min(1, 'Name your list.').max(80, 'Keep the title under 80 characters.'),
  description: z.string().trim().max(300, 'Keep the description under 300 characters.').optional(),
  visibility: z.enum(['private', 'friends', 'public']),
})
const createInput = listInput.extend({ crewId: z.string().uuid().optional() })
const uuid = z.string().uuid()

async function me() {
  const supabase = await createServerClient()
  const { data } = await supabase.auth.getUser()
  return { supabase, id: data.user?.id }
}

export async function createList(input: z.input<typeof createInput>): Promise<Result> {
  const p = createInput.safeParse(input)
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? FAIL.error }
  const { supabase, id } = await me()
  if (!id) return SIGNED_OUT
  const { title, description, visibility, crewId } = p.data
  // exactly one of owner_id / crew_id; RLS requires crew membership
  const { data, error } = await supabase.from('lists')
    .insert({ title, description: description || null, visibility, ...(crewId ? { crew_id: crewId } : { owner_id: id }) })
    .select('id').single()
  if (error || !data) return FAIL
  revalidatePath(crewId ? `/crews/${crewId}` : '/')
  return { ok: true, id: data.id }
}

export async function updateList(listId: string, input: z.input<typeof listInput>): Promise<Result> {
  const p = listInput.safeParse(input)
  if (!p.success || !uuid.safeParse(listId).success) return { ok: false, error: p.success ? FAIL.error : p.error.issues[0]?.message }
  const { supabase, id } = await me()
  if (!id) return SIGNED_OUT
  const { data, error } = await supabase.from('lists')
    .update({ title: p.data.title, description: p.data.description || null, visibility: p.data.visibility })
    .eq('id', listId).select('id')
  if (error || !data?.length) return FAIL
  revalidatePath(`/lists/${listId}`)
  return { ok: true }
}

export async function addToList(listId: string, tmdbId: number, note?: string): Promise<Result> {
  if (!uuid.safeParse(listId).success || !Number.isInteger(tmdbId) || tmdbId <= 0) return FAIL
  const { supabase, id } = await me()
  if (!id) return SIGNED_OUT
  try { await ensureMovieCached(tmdbId) } catch { return { ok: false, error: 'Could not reach the movie database. Try again.' } }
  const { data: last } = await supabase.from('list_items').select('position').eq('list_id', listId)
    .order('position', { ascending: false }).limit(1).maybeSingle()
  const { error } = await supabase.from('list_items').insert({
    list_id: listId, tmdb_id: tmdbId, position: (last?.position ?? -1) + 1, added_by: id, note: note?.trim().slice(0, 140) || null,
  })
  if (error) return error.code === '23505' ? { ok: false, error: 'Already on that list.' } : FAIL
  revalidatePath(`/lists/${listId}`)
  return { ok: true }
}

export async function removeFromList(listId: string, tmdbId: number): Promise<Result> {
  const { supabase, id } = await me()
  if (!id) return SIGNED_OUT
  const { error } = await supabase.from('list_items').delete().eq('list_id', listId).eq('tmdb_id', tmdbId)
  if (error) return FAIL
  revalidatePath(`/lists/${listId}`)
  return { ok: true }
}

// One RPC (security invoker, so RLS applies); it rejects anything that is not a permutation of the current items.
export async function reorderList(listId: string, orderedTmdbIds: number[]): Promise<Result> {
  if (!uuid.safeParse(listId).success || !orderedTmdbIds.every(Number.isInteger)) return FAIL
  const { supabase, id } = await me()
  if (!id) return SIGNED_OUT
  const { error } = await supabase.rpc('reorder_list', { p_list: listId, p_ids: orderedTmdbIds })
  if (error) return { ok: false, error: 'Could not reorder. Refresh and try again.' }
  revalidatePath(`/lists/${listId}`)
  return { ok: true }
}

export type MyList = { id: string; title: string; crewName: string | null }
export async function getMyWritableLists(): Promise<MyList[]> {
  const { supabase, id } = await me()
  if (!id) return []
  const [own, crews] = await Promise.all([
    supabase.from('lists').select('id, title').eq('owner_id', id).order('title'),
    supabase.from('crew_members').select('crews(name, lists(id, title))').eq('user_id', id),
  ])
  const fromCrews = (crews.data ?? []).flatMap((m) => {
    const c = m.crews as unknown as { name: string; lists: { id: string; title: string }[] } | null
    return (c?.lists ?? []).map((l) => ({ id: l.id, title: l.title, crewName: c!.name }))
  })
  return [...(own.data ?? []).map((l) => ({ ...l, crewName: null })), ...fromCrews]
}
