'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addCrewMemberByUsername, createCrew, leaveCrew, removeCrewMember } from '@/actions/crews'

const input = 'h-10 rounded-control bg-raised px-4 text-text'
const pill = 'rounded-full bg-accent-fill px-5 py-2 text-sm font-semibold text-white'

function useAct() {
  const [error, setError] = useState('')
  const [pending, start] = useTransition()
  const run = (fn: () => Promise<{ ok: boolean; error?: string; id?: string }>, then?: (id?: string) => void) =>
    start(async () => {
      try {
        const r = await fn()
        setError(r.ok ? '' : r.error ?? 'Something went wrong.')
        if (r.ok) then?.(r.id)
      } catch {
        setError('Something went wrong. Try again.')
      }
    })
  return { error, pending, run }
}

export function CreateCrewForm() {
  const [name, setName] = useState('')
  const router = useRouter()
  const { error, pending, run } = useAct()
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); run(() => createCrew(name), (id) => router.push(`/crews/${id}`)) }}
      className="mt-6 flex flex-wrap items-center gap-3"
    >
      <input aria-label="Crew name" placeholder="Crew name" value={name} onChange={(e) => setName(e.target.value)} className={input} />
      <button disabled={pending} className={pill}>Start a crew</button>
      {error && <p role="alert" className="w-full text-sm text-drunk">{error}</p>}
    </form>
  )
}

export function AddMemberForm({ crewId }: { crewId: string }) {
  const [u, setU] = useState('')
  const { error, pending, run } = useAct()
  return (
    <form onSubmit={(e) => { e.preventDefault(); run(() => addCrewMemberByUsername(crewId, u), () => setU('')) }} className="mt-4 flex flex-wrap items-center gap-3">
      <input aria-label="Add a friend by username" placeholder="Friend's username" value={u} onChange={(e) => setU(e.target.value)} className={input} />
      <button disabled={pending} className={pill}>Add</button>
      {error && <p role="alert" className="w-full text-sm text-drunk">{error}</p>}
    </form>
  )
}

export function MemberButton({ crewId, userId, self }: { crewId: string; userId: string; self: boolean }) {
  const router = useRouter()
  const { error, pending, run } = useAct()
  return (
    <>
      <button
        disabled={pending}
        onClick={() => run(() => (self ? leaveCrew(crewId) : removeCrewMember(crewId, userId)), () => (self ? router.push('/crews') : undefined))}
        className="rounded-full bg-raised px-3 py-1 text-xs text-muted"
      >
        {self ? 'Leave' : 'Remove'}
      </button>
      {error && <span role="alert" className="text-xs text-drunk">{error}</span>}
    </>
  )
}
