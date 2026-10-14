'use client'
import { useState, useTransition } from 'react'
import { acceptFriend, removeFriend, requestFriend, searchUsers, type FriendProfile, type Relation } from '@/actions/friends'

type Hit = FriendProfile & { relation: Relation }
const pill = 'rounded-full px-4 py-1.5 text-sm'
const primary = `${pill} bg-accent-fill text-white`
const secondary = `${pill} bg-raised text-foreground`

function Row({ p, children }: { p: FriendProfile; children?: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 border-b border-line py-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {p.avatar_url ? <img src={p.avatar_url} alt="" className="size-9 rounded-full object-cover" />
        : <span className="grid size-9 place-items-center rounded-full bg-raised text-sm uppercase">{p.username[0]}</span>}
      <span className="flex-1">{p.display_name || p.username}<span className="ml-2 text-sm text-muted">@{p.username}</span></span>
      {children}
    </li>
  )
}

export function FriendsClient({ username, friends, incoming, sent }: {
  username: string; friends: FriendProfile[]; incoming: FriendProfile[]; sent: FriendProfile[]
}) {
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<Hit[]>([])
  const [msg, setMsg] = useState('')
  const [copied, setCopied] = useState(false)
  const [, start] = useTransition()

  const search = (v: string) => { setQ(v); start(async () => setHits(await searchUsers(v))) }
  const act = (fn: (id: string) => Promise<{ ok: boolean; error?: string }>, id: string) =>
    start(async () => {
      const r = await fn(id)
      setMsg(r.ok ? '' : r.error ?? 'Something went wrong.')
      if (r.ok && q) setHits(await searchUsers(q))
    })
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${location.origin}/u/${username}?add=1`)
      setCopied(true)
    } catch { setMsg('Could not copy. Copy the link by hand.') }
  }

  return (
    <div className="mt-6 max-w-xl">
      <input value={q} onChange={(e) => search(e.target.value)} placeholder="Find people by username" aria-label="Search by username"
        className="w-full rounded-xl bg-raised px-4 py-3 outline-none focus:ring-2 focus:ring-ring" />
      {msg && <p role="alert" className="mt-2 text-sm text-muted">{msg}</p>}
      <ul>
        {hits.map((h) => (
          <Row key={h.id} p={h}>
            {h.relation === 'none' && <button className={primary} onClick={() => act(requestFriend, h.id)}>Add</button>}
            {h.relation === 'incoming' && <button className={primary} onClick={() => act(acceptFriend, h.id)}>Accept</button>}
            {h.relation === 'sent' && <span className={`${secondary} opacity-70`}>Requested</span>}
            {h.relation === 'friends' && <span className={`${secondary} opacity-70`}>Friends</span>}
          </Row>
        ))}
      </ul>

      {incoming.length > 0 && <>
        <h2 className="mt-8 font-display text-xl">Requests for you</h2>
        <ul>{incoming.map((p) => (
          <Row key={p.id} p={p}>
            <button className={primary} onClick={() => act(acceptFriend, p.id)}>Accept</button>
            <button className={secondary} onClick={() => act(removeFriend, p.id)}>Decline</button>
          </Row>))}</ul>
      </>}
      {sent.length > 0 && <>
        <h2 className="mt-8 font-display text-xl">Sent</h2>
        <ul>{sent.map((p) => (
          <Row key={p.id} p={p}><button className={secondary} onClick={() => act(removeFriend, p.id)}>Cancel</button></Row>))}</ul>
      </>}

      <h2 className="mt-8 font-display text-xl">Your friends</h2>
      {friends.length === 0 ? <p className="py-3 text-muted">No friends yet. Search above or send an invite.</p> : (
        <ul>{friends.map((p) => (
          <Row key={p.id} p={p}><button className={secondary} onClick={() => act(removeFriend, p.id)}>Remove</button></Row>))}</ul>
      )}

      <div className="mt-8 flex items-center gap-3 border-t border-line pt-4">
        <span className="flex-1">Invite a friend</span>
        <button className={secondary} onClick={copy}>{copied ? 'Copied' : 'Copy link'}</button>
      </div>
    </div>
  )
}
