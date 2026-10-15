'use server'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'

// Throws on failure so the client can roll back its optimistic state.
export async function toggleCheers(sessionId: string): Promise<{ cheered: boolean; count: number }> {
  const sb = await createServerClient()
  const { data } = await sb.auth.getUser()
  const me = data.user?.id
  if (!me) throw new Error('signed out')
  const { data: existing, error: e1 } = await sb.from('cheers').select('user_id').eq('session_id', sessionId).eq('user_id', me).maybeSingle()
  if (e1) throw new Error(e1.message)
  const { error } = existing
    ? await sb.from('cheers').delete().eq('session_id', sessionId).eq('user_id', me)
    : await sb.from('cheers').insert({ session_id: sessionId, user_id: me })
  if (error && error.code !== '23505') throw new Error(error.message) // 23505: already cheered
  const { count, error: e2 } = await sb.from('cheers').select('*', { count: 'exact', head: true }).eq('session_id', sessionId)
  if (e2) throw new Error(e2.message)
  revalidatePath('/')
  return { cheered: !existing, count: count ?? 0 }
}
