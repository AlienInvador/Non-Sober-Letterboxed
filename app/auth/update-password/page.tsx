'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase/client'

export default function UpdatePassword() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    createBrowserClient().auth.getUser().then(({ data }) => setSignedIn(!!data.user), () => setSignedIn(false))
  }, [])

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (pending) return
    setError('')
    const password = String(new FormData(e.currentTarget).get('password'))
    if (password.length < 8) return setError('Use at least 8 characters.')
    setPending(true)
    try {
      const { error } = await createBrowserClient().auth.updateUser({ password })
      if (error) setError(error.message)
      else {
        window.location.assign('/')
        return
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update the password. Try again.')
    }
    setPending(false)
  }

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center gap-5 px-6 py-12">
      <p className="font-note text-2xl text-note">fresh start</p>
      <h1 className="font-display text-4xl">New password</h1>
      {signedIn === false ? (
        <Link href="/auth/login" className="underline">Sign in first</Link>
      ) : (
        <form method="post" onSubmit={submit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-sm text-muted">
            New password
            <input type="password" name="password" autoComplete="new-password" required className="rounded-xl bg-raised px-4 py-3 text-base text-text" />
          </label>
          <button type="submit" disabled={pending || signedIn === null} className="rounded-full bg-accent-fill px-6 py-3 font-semibold text-white disabled:opacity-60">Update password</button>
        </form>
      )}
      {error && <p role="alert" className="text-drunk">{error}</p>}
    </main>
  )
}
