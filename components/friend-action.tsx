'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { acceptFriend, requestFriend } from '@/actions/friends'
import type { FriendStatus } from '@/lib/queries/profile'

const pill = 'rounded-full px-4 py-1.5 text-sm'

export function FriendAction({ userId, status, highlight }: { userId: string; status: FriendStatus; highlight?: boolean }) {
  const router = useRouter()
  const [msg, setMsg] = useState('')
  const [pending, start] = useTransition()
  if (status === 'self') return null
  if (status === 'friends') return <span className={`${pill} bg-raised`}>Friends ✓</span>
  if (status === 'sent') return <span className={`${pill} bg-raised opacity-70`}>Requested</span>
  const go = (fn: typeof requestFriend) => start(async () => {
    const r = await fn(userId)
    if (r.ok) router.refresh()
    else setMsg(r.error ?? 'Something went wrong.')
  })
  return (
    <span>
      <button disabled={pending} onClick={() => go(status === 'incoming' ? acceptFriend : requestFriend)}
        className={`${pill} bg-accent-fill text-white ${highlight ? 'ring-2 ring-ring ring-offset-2 ring-offset-bg' : ''}`}>
        {status === 'incoming' ? 'Accept' : 'Add friend'}
      </button>
      {msg && <span role="alert" className="ml-3 text-sm text-muted">{msg}</span>}
    </span>
  )
}
