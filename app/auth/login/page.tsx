'use client'
import { useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'

export default function Login() {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const redirectTo = () => `${window.location.origin}/auth/callback`

  async function magic(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const email = String(new FormData(e.currentTarget).get('email'))
    try {
      const { error } = await createBrowserClient().auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo() } })
      if (error) setError(error.message)
      else setSent(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the link. Try again.')
    }
  }

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center gap-5 px-6 py-12">
      <p className="font-note text-2xl text-note">welcome back</p>
      <h1 className="font-display text-4xl">Log in</h1>
      {sent ? (
        <p className="text-body">Check your email for a magic link.</p>
      ) : (
        <form onSubmit={magic} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-sm text-muted">
            Email
            <input type="email" name="email" required className="rounded-xl bg-raised px-4 py-3 text-base text-text" />
          </label>
          <button type="submit" className="rounded-full bg-accent-fill px-6 py-3 font-semibold text-white">Send magic link</button>
        </form>
      )}
      {error && <p role="alert" className="text-drunk">{error}</p>}
    </main>
  )
}
