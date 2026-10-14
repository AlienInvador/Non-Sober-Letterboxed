'use server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { isAtLeast21 } from '@/lib/age'

export type GateState = { ok: false; reason: 'under21' } | null

export async function verifyAge(_prev: GateState, formData: FormData): Promise<GateState> {
  const dob = String(formData.get('dob') ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || !isAtLeast21(dob)) return { ok: false, reason: 'under21' }
  const store = await cookies()
  store.set('age_ok', '1', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  })
  redirect('/auth/login')
}
