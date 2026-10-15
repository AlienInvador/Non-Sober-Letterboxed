'use client'
import { useTransition } from 'react'
import Link from 'next/link'
import { dismissRec } from '@/actions/recs'
import { stateWord } from '@/lib/influence'
import type { RecItem } from '@/lib/queries/recs'

export function RecsInbox({ recs }: { recs: RecItem[] }) {
  return (
    <ul className="mt-4 divide-y divide-line">
      {recs.map((r) => <RecRow key={r.id} rec={r} />)}
    </ul>
  )
}

function RecRow({ rec }: { rec: RecItem }) {
  const [pending, start] = useTransition()
  return (
    <li className="flex gap-4 py-4">
      <span className="block aspect-[2/3] w-[72px] shrink-0 overflow-hidden rounded-poster bg-raised">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {rec.poster && <img src={rec.poster} alt="" className="size-full object-cover" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-note text-2xl text-note">{rec.from} says watch {rec.movie.title} {stateWord(rec.influence)}</p>
        {rec.note && <p className="mt-1 text-body">{rec.note}</p>}
        <div className="mt-2 flex gap-4 text-sm">
          <Link href={`/movie/${rec.movie.tmdbId}`} className="font-semibold text-accent">See movie</Link>
          {rec.dismissible && (
            <button type="button" disabled={pending} onClick={() => start(async () => { await dismissRec(rec.id) })} className="text-muted disabled:opacity-40">
              Dismiss
            </button>
          )}
        </div>
      </div>
    </li>
  )
}
