'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import type { Result } from '@/actions/sessions'

export async function declineTag(sessionId: string): Promise<Result> {
  const id = z.uuid().safeParse(sessionId)
  if (!id.success) return { ok: false, error: 'Invalid tag.' }
  const supabase = await createServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return { ok: false, error: 'You are signed out. Sign in again.' }
  const { data, error } = await supabase
    .from('session_companions').update({ status: 'declined' })
    .eq('user_id', auth.user.id).eq('session_id', id.data).select('session_id')
  if (error || !data?.length) return { ok: false, error: 'Could not decline that tag.' }
  revalidatePath('/')
  return { ok: true }
}
