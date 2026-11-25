'use client'
import { useState } from 'react'
import { AlertDialog } from 'radix-ui'
import { createBrowserClient } from '@/lib/supabase/client'
import { setDefaultVisibility, deleteAccount } from '@/actions/settings'

type Vis = 'private' | 'crew' | 'friends' | 'public'
const input = 'rounded-xl bg-raised px-4 py-3 text-base text-text'
const button = 'rounded-full bg-accent-fill px-6 py-3 font-semibold text-white disabled:opacity-60'

// Runs an async step with a pending flag. fn returns an error message, or nothing on success (then `done` shows).
function useStep() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  async function run(fn: () => Promise<string | void>, done: string) {
    if (pending) return
    setError(''); setNote(''); setPending(true)
    try {
      const err = await fn()
      if (err) setError(err); else setNote(done)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.')
    }
    setPending(false)
  }
  const msg = (
    <>
      {error && <p role="alert" className="text-drunk">{error}</p>}
      {note && <p role="status" className="text-sm text-muted">{note}</p>}
    </>
  )
  return { pending, run, msg }
}

function PasswordForm() {
  const s = useStep()
  return (
    <form method="post" className="flex flex-col gap-3" onSubmit={(e) => {
      e.preventDefault()
      const form = e.currentTarget
      const password = String(new FormData(form).get('password'))
      if (password.length < 8) return s.run(async () => 'Use at least 8 characters.', '')
      return s.run(async () => {
        const { error } = await createBrowserClient().auth.updateUser({ password })
        if (error) return error.message
        form.reset()
      }, 'Password updated.')
    }}>
      <label className="flex flex-col gap-2 text-sm text-muted">
        New password
        <input type="password" name="password" autoComplete="new-password" required className={input} />
      </label>
      <button type="submit" disabled={s.pending} className={`self-start ${button}`}>Change password</button>
      {s.msg}
    </form>
  )
}

function ResetLink({ email }: { email: string }) {
  const s = useStep()
  return (
    <form method="post" className="flex flex-col gap-3" onSubmit={(e) => {
      e.preventDefault()
      return s.run(async () => {
        const { error } = await createBrowserClient().auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
        })
        if (error) return error.message
      }, 'Check your email for the reset link.')
    }}>
      <button type="submit" disabled={s.pending} className="self-start rounded-full bg-raised px-6 py-3 disabled:opacity-60">Email me a reset link</button>
      {s.msg}
    </form>
  )
}

function EmailForm({ email }: { email: string }) {
  const s = useStep()
  return (
    <form method="post" className="flex flex-col gap-3" onSubmit={(e) => {
      e.preventDefault()
      const next = String(new FormData(e.currentTarget).get('email')).trim()
      return s.run(async () => {
        const { error } = await createBrowserClient().auth.updateUser({ email: next }, { emailRedirectTo: `${window.location.origin}/auth/callback` })
        if (error) return error.message
      }, 'Check your inbox to confirm the new email.')
    }}>
      <label className="flex flex-col gap-2 text-sm text-muted">
        Email
        <input type="email" name="email" defaultValue={email} autoComplete="email" required className={input} />
      </label>
      <button type="submit" disabled={s.pending} className={`self-start ${button}`}>Change email</button>
      {s.msg}
    </form>
  )
}

function VisibilityForm({ initial }: { initial: Vis }) {
  const s = useStep()
  const [value, setValue] = useState(initial)
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-2 text-sm text-muted">
        Default visibility
        <select value={value} disabled={s.pending} className={input} onChange={(e) => {
          const v = e.target.value as Vis
          setValue(v)
          s.run(async () => { const r = await setDefaultVisibility(v); if (!r.ok) return r.error }, 'Saved')
        }}>
          <option value="friends">Friends</option>
          <option value="crew">Crew</option>
          <option value="public">Public</option>
          <option value="private">Only me</option>
        </select>
      </label>
      {s.msg}
    </div>
  )
}

export function SettingsForms({ email, defaultVisibility }: { email: string; defaultVisibility: Vis }) {
  return (
    <>
      <section className="flex flex-col gap-4"><h2 className="font-display text-2xl">Password</h2><PasswordForm /><ResetLink email={email} /></section>
      <section className="flex flex-col gap-4"><h2 className="font-display text-2xl">Email</h2><EmailForm email={email} /></section>
      <section className="flex flex-col gap-4"><h2 className="font-display text-2xl">New seshes</h2><VisibilityForm initial={defaultVisibility} /></section>
    </>
  )
}

export function DeleteAccount({ username }: { username: string }) {
  const s = useStep()
  return (
    <section className="flex flex-col gap-3 border-t border-line pt-8">
      <h2 className="font-display text-2xl text-drunk">Danger zone</h2>
      <p className="text-sm text-muted">Deleting your account removes your seshes, lists, friends and crew memberships for good.</p>
      <AlertDialog.Root>
        <AlertDialog.Trigger className="self-start rounded-full border border-drunk px-6 py-3 text-drunk">Delete account</AlertDialog.Trigger>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-40 bg-black/60" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 flex w-[min(28rem,90vw)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-2xl bg-card p-6">
            <AlertDialog.Title className="font-display text-2xl">Delete your account?</AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-muted">
              This cannot be undone. Type your username (<b>{username}</b>) to confirm.
            </AlertDialog.Description>
            <form method="post" className="flex flex-col gap-3" onSubmit={(e) => {
              e.preventDefault()
              const typed = String(new FormData(e.currentTarget).get('confirm'))
              return s.run(async () => { const r = await deleteAccount(typed); if (r && !r.ok) return r.error }, '')
            }}>
              <label className="flex flex-col gap-2 text-sm text-muted">
                Your username
                <input name="confirm" autoComplete="off" required className={input} />
              </label>
              {s.msg}
              <div className="flex justify-end gap-3">
                <AlertDialog.Cancel className="rounded-full bg-raised px-5 py-2">Cancel</AlertDialog.Cancel>
                <button type="submit" disabled={s.pending} className="rounded-full bg-drunk px-5 py-2 font-semibold text-white disabled:opacity-60">Delete forever</button>
              </div>
            </form>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </section>
  )
}
