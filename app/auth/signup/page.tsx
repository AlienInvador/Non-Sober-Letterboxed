'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase/client'

export default function Signup() {
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [agreed, setAgreed] = useState(false)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (pending || !agreed) return
    setError('')
    const f = new FormData(e.currentTarget)
    const password = String(f.get('password'))
    if (password.length < 8) return setError('Use at least 8 characters.')
    setPending(true)
    try {
      const { data, error } = await createBrowserClient().auth.signUp({
        email: String(f.get('email')),
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) setError(error.message)
      else if (!data.session) {
        setConfirm(true)
        return
      } else {
        window.location.assign('/auth/callback')
        return
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the account. Try again.')
    }
    setPending(false)
  }

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center gap-5 px-6 py-12">
      <p className="font-note text-2xl text-note">good to see you</p>
      <h1 className="font-display text-4xl">Create account</h1>
      {confirm ? (
        <p className="text-body">Check your email to confirm.</p>
      ) : (
        <form method="post" onSubmit={submit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-sm text-muted">
            Email
            <input type="email" name="email" autoComplete="email" required className="rounded-xl bg-raised px-4 py-3 text-base text-text" />
          </label>
          <label className="flex flex-col gap-2 text-sm text-muted">
            Password
            <input type="password" name="password" autoComplete="new-password" required className="rounded-xl bg-raised px-4 py-3 text-base text-text" />
          </label>
          <label className="flex items-start gap-3 text-sm text-muted">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 size-4" />
            <span>I&apos;m 21+ and agree to the <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Privacy Policy</Link></span>
          </label>
          <button type="submit" disabled={pending || !agreed} className="rounded-full bg-accent-fill px-6 py-3 font-semibold text-white disabled:opacity-60">Create account</button>
        </form>
      )}
      {error && <p role="alert" className="text-drunk">{error}</p>}
      <p className="text-sm text-muted">
        <Link href="/auth/login" className="underline">log in</Link>
      </p>
    </main>
  )
}
