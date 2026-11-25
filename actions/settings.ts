'use server'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Result } from '@/actions/sessions'

const VIS = ['private', 'crew', 'friends', 'public'] as const

export async function setDefaultVisibility(v: (typeof VIS)[number]): Promise<Result> {
  if (!VIS.includes(v)) return { ok: false, error: 'Pick a valid visibility.' }
  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { ok: false, error: 'Log in first.' }
  const { error } = await sb.from('profiles').update({ default_visibility: v }).eq('id', user.id)
  return error ? { ok: false, error: 'Could not save. Try again.' } : { ok: true }
}

export async function deleteAccount(confirmUsername: string): Promise<Result> {
  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { ok: false, error: 'Log in first.' }
  const { data: prof } = await sb.from('profiles').select('username').eq('id', user.id).maybeSingle()
  if (!prof || String(confirmUsername).trim().toLowerCase() !== prof.username.toLowerCase())
    return { ok: false, error: 'Type your username exactly to confirm.' }
  const { error } = await createAdminClient().auth.admin.deleteUser(user.id)
  if (error) return { ok: false, error: 'Could not delete your account. Try again.' }
  await sb.auth.signOut() // clears the session cookies
  redirect('/')
}
