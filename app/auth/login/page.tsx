'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase/client'

export default function Login() {
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('error') === 'link') setError('That link expired. Try again.')
  }, [])

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (pending) return
    setError('')
    setPending(true)
    const f = new FormData(e.currentTarget)
    try {
      const { error } = await createBrowserClient().auth.signInWithPassword({ email: String(f.get('email')), password: String(f.get('password')) })
      if (error) setError(error.message)
      else {
        window.location.assign('/auth/callback') // honors a saved invite link
        return
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not log in. Try again.')
    }
    setPending(false)
  }

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center gap-5 px-6 py-12">
      <p className="font-note text-2xl text-note">good to see you</p>
      <h1 className="font-display text-4xl">Log in</h1>
      <form method="post" onSubmit={submit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2 text-sm text-muted">
          Email
          <input type="email" name="email" autoComplete="email" required className="rounded-xl bg-raised px-4 py-3 text-base text-text" />
        </label>
        <label className="flex flex-col gap-2 text-sm text-muted">
          Password
          <input type="password" name="password" autoComplete="current-password" required className="rounded-xl bg-raised px-4 py-3 text-base text-text" />
        </label>
        <button type="submit" disabled={pending} className="rounded-full bg-accent-fill px-6 py-3 font-semibold text-white disabled:opacity-60">Log in</button>
      </form>
      {error && <p role="alert" className="text-drunk">{error}</p>}
      <p className="flex gap-4 text-sm text-muted">
        <Link href="/auth/signup" className="underline">create account</Link>
        <Link href="/auth/reset" className="underline">forgot password</Link>
      </p>
    </main>
  )
}
