'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'
import { takeNext } from '@/actions/auth'

export default function Onboarding() {
  const router = useRouter()
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const f = new FormData(e.currentTarget)
    const supabase = createBrowserClient()
    const { data } = await supabase.auth.getUser()
    if (!data.user) return router.push('/auth/login')
    const username = String(f.get('username')).trim()
    const { error } = await supabase.from('profiles').insert({
      id: data.user.id,
      username,
      display_name: username,
      birthdate: String(f.get('dob')),
    })
    if (error) {
      setError(
        error.code === '23505' ? 'That username is taken.'
          : error.code === 'P0001' ? 'You must be 21 or older to join.'
          : 'Could not create your profile. Try again.',
      )
    } else router.push(await takeNext())
  }

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center gap-5 px-6 py-12">
      <p className="font-note text-2xl text-note">one last thing</p>
      <h1 className="font-display text-4xl">Set up your profile</h1>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2 text-sm text-muted">
          Username
          <input name="username" required minLength={3} maxLength={24} pattern="[a-zA-Z0-9_]+" className="rounded-xl bg-raised px-4 py-3 text-base text-text" />
        </label>
        <label className="flex flex-col gap-2 text-sm text-muted">
          Date of birth
          <input type="date" name="dob" required className="rounded-xl bg-raised px-4 py-3 text-base text-text" />
        </label>
        <button type="submit" className="rounded-full bg-accent-fill px-6 py-3 font-semibold text-white">Join</button>
        {error && <p role="alert" className="text-drunk">{error}</p>}
      </form>
    </main>
  )
}
