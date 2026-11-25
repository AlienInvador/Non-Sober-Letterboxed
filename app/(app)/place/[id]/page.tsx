import { notFound } from 'next/navigation'
import { z } from 'zod'
import { getPlace } from '@/lib/queries/place'
import { HowItHits } from '@/components/how-it-hits'
import { PlaceTile } from '@/components/place-tile'
import { PlaceActions } from '@/components/place-actions'
import { SessionCard } from '@/components/session-card'

export default async function PlacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!z.uuid().safeParse(id).success) notFound()
  const data = await getPlace(id)
  if (!data) notFound()
  const { me, place, stats, seshes } = data

  return (
    <main className="pb-20">
      <div className="flex flex-wrap items-end gap-8 px-6 pt-12 sm:px-10">
        <PlaceTile place={place} showName={false} />
        <div className="min-w-0 flex-1 basis-72">
          <h1 className="font-display text-[clamp(38px,6vw,60px)] leading-none tracking-[-0.03em]">{place.name}</h1>
          <p className="mt-3 font-note text-xl text-note">a spot, not a place on a map. just what it does to you.</p>
          <PlaceActions place={place} />
        </div>
      </div>

      <div className="mt-14 space-y-14 px-6 sm:px-10">
        <section aria-labelledby="hits">
          <h2 id="hits" className="mb-4 font-display text-2xl">How it hits</h2>
          <HowItHits stats={stats} />
          <p className="mt-3 text-xs text-muted">from public logs only. the list below is just your people.</p>
        </section>
        <section aria-labelledby="logs">
          <h2 id="logs" className="mb-4 font-display text-2xl">Your people&apos;s logs</h2>
          {seshes.length === 0 ? <p className="text-muted">no logs yet.</p> : seshes.map((s, i) => <SessionCard key={s.id} item={s} index={i} isMine={s.profile.id === me} />)}
        </section>
      </div>
    </main>
  )
}
