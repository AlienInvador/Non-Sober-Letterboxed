'use server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { safeNext } from '@/lib/safe-next'

export async function signOut() {
  const supabase = await createServerClient()
  await supabase.auth.signOut()
  redirect('/')
}

// Reads and clears the invite-target cookie set by middleware. Returns '/' when absent or unsafe.
export async function takeNext(): Promise<string> {
  const store = await cookies()
  const next = safeNext(store.get('next')?.value)
  store.delete('next')
  return next ?? '/'
}
