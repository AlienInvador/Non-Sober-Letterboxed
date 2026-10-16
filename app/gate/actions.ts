'use server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { isAtLeast21 } from '@/lib/age'
import { safeNext } from '@/lib/safe-next'

export type GateState = { ok: false; reason: 'under21' } | null

export async function verifyAge(_prev: GateState, formData: FormData): Promise<GateState> {
  const dob = String(formData.get('dob') ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || !isAtLeast21(dob)) return { ok: false, reason: 'under21' }
  const store = await cookies()
  const opts = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  }
  store.set('age_ok', '1', opts)
  // Onboarding reuses this so the user isn't asked their age twice; the DB trigger still enforces 21+.
  store.set('dob', dob, opts)
  const next = safeNext(store.get('next')?.value)
  store.delete('next')
  redirect(next ?? '/')
}
