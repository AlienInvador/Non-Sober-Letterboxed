import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProfile } from '@/lib/queries/profile'
import { influenceLabel, type Influence } from '@/lib/influence'
import { tokens } from '@/design/tokens'
import { SessionCard } from '@/components/session-card'
import { EmptyState } from '@/components/empty-state'
import { FriendAction } from '@/components/friend-action'

const ORDER: Influence[] = ['drunk', 'high', 'both', 'sober']

export default async function ProfilePage({ params, searchParams }: {
  params: Promise<{ username: string }>; searchParams: Promise<{ add?: string }>
}) {
  const [{ username }, { add }] = await Promise.all([params, searchParams])
  const data = await getProfile(decodeURIComponent(username))
  if (!data) notFound()
  const { profile, status, total, breakdown, months, lists } = data
  const shown = ORDER.filter((k) => breakdown[k] > 0)

  return (
    <main className="max-w-3xl p-10">
      <header className="flex items-center gap-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" className="size-20 rounded-full object-cover" />
          : <span className="font-display grid size-20 place-items-center rounded-full bg-raised text-3xl uppercase">{profile.username[0]}</span>}
        <div className="flex-1">
          <h1 className="font-display text-4xl">{profile.displayName || profile.username}</h1>
          <p className="text-muted">@{profile.username}</p>
        </div>
        <FriendAction userId={profile.id} status={status} highlight={add === '1'} />
      </header>

      <section className="mt-8 flex items-center gap-6" aria-label="Stats">
        <p><span className="font-mono text-2xl">{total}</span> <span className="text-muted">seshes</span></p>
        {shown.length > 0 && (
          <div className="flex-1">
            <div className="flex h-2 overflow-hidden rounded-full bg-track" role="img"
              aria-label={shown.map((k) => `${influenceLabel(k)} ${breakdown[k]}%`).join(', ')}>
              {shown.map((k) => <span key={k} style={{ width: `${breakdown[k]}%`, background: tokens.color[k] }} />)}
            </div>
            <ul className="mt-2 flex flex-wrap gap-x-4 text-sm">
              {shown.map((k) => <li key={k} style={{ color: tokens.color[k] }}>{influenceLabel(k)} <span className="font-mono">{breakdown[k]}%</span></li>)}
            </ul>
          </div>
        )}
      </section>

      <section className="mt-10">
        {months.length === 0 ? (
          status === 'self'
            ? <EmptyState title="Log your first sesh"><p>Pick a movie and say how it hit.</p></EmptyState>
            : <EmptyState title="Nothing to see here yet" />
        ) : months.map((m) => (
          <div key={m.label} className="mb-8">
            <h2 className="font-display border-b border-line pb-2 text-[20px]">{m.label}</h2>
            {m.items.map((item, i) => <SessionCard key={item.id} item={item} index={i} />)}
          </div>
        ))}
      </section>

      {lists.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-[20px]">Lists</h2>
          <ul>
            {lists.map((l) => (
              <li key={l.id} className="border-b border-line py-3">
                <Link href={`/lists/${l.id}`}>{l.title}</Link>
                <span className="ml-3 font-mono text-xs text-muted">{l.count}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}
