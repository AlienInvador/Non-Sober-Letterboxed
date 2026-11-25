'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase/client'

export default function Reset() {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (pending) return
    setError('')
    setPending(true)
    const email = String(new FormData(e.currentTarget).get('email'))
    try {
      const { error } = await createBrowserClient().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
      })
      if (error) setError(error.message)
      else setSent(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the link. Try again.')
    }
    setPending(false)
  }

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center gap-5 px-6 py-12">
      <p className="font-note text-2xl text-note">it happens</p>
      <h1 className="font-display text-4xl">Reset password</h1>
      {sent ? (
        <p className="text-body">Check your email for a reset link.</p>
      ) : (
        <form method="post" onSubmit={submit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-sm text-muted">
            Email
            <input type="email" name="email" autoComplete="email" required className="rounded-xl bg-raised px-4 py-3 text-base text-text" />
          </label>
          <button type="submit" disabled={pending} className="rounded-full bg-accent-fill px-6 py-3 font-semibold text-white disabled:opacity-60">Send reset link</button>
        </form>
      )}
      {error && <p role="alert" className="text-drunk">{error}</p>}
      <p className="text-sm text-muted">
        <Link href="/auth/login" className="underline">log in</Link>
      </p>
    </main>
  )
}
