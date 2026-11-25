import Link from 'next/link'
import type { FeedItem } from '@/lib/queries/feed'
import { posterUrl } from '@/lib/tmdb'
import { subjectHref, subjectTitle } from '@/lib/subject'
import { PlaceTile } from '@/components/place-tile'
import { influenceLabel } from '@/lib/influence'
import { relativeTime } from '@/lib/time'
import { tokens } from '@/design/tokens'
import { InfluenceDot } from '@/components/influence-chip'
import { CheersButton } from '@/components/cheers-button'
import { DeleteSesh } from '@/components/delete-sesh'

const WHEN = { drunk: 'drunk', high: 'high', both: 'drunk and high', sober: '' }
const verdict = (i: FeedItem) =>
  i.recommend === null || i.influence === 'sober' ? null : `${i.recommend ? 'Recommends it' : 'Would skip it'} ${WHEN[i.influence]}`

export function SessionCard({ item, index = 0, isMine = false }: { item: FeedItem; index?: number; isMine?: boolean }) {
  const s = item.subject
  const poster = s.kind === 'movie' ? posterUrl(s.movie.posterPath, 'w185') : null
  const color = tokens.color[item.influence]
  return (
    <article
      className="rise group flex gap-5 border-b border-line py-6 last:border-b-0"
      style={{ '--i': index } as React.CSSProperties}
    >
      <Link href={subjectHref(s)} aria-label={subjectTitle(s)} className="block h-[162px] w-[108px] shrink-0 overflow-hidden rounded-poster bg-raised">
        {s.kind === 'place' ? <PlaceTile place={s.place} showName={false} /> : poster && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt={subjectTitle(s)} className="size-full object-cover" />
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-muted">
          <Link href={`/u/${item.profile.username}`} className="text-text underline underline-offset-2">{item.profile.username}</Link>
          {' · '}
          <span className="font-mono text-xs">{relativeTime(item.createdAt)}</span>
        </p>
        <h3 className="font-display mt-1 text-2xl">{subjectTitle(s)}</h3>
        {item.withNames.length > 0 && <p className="text-sm text-muted">with {item.withNames.join(', ')}</p>}
        <p className="mt-2 flex items-center gap-2 text-sm" style={{ color }}>
          <InfluenceDot influence={item.influence} />
          {influenceLabel(item.influence)}
          {verdict(item) && <span>· {verdict(item)}</span>}
        </p>
        {item.review && <p className="mt-3 text-[17px] leading-[1.7] text-body">{item.review}</p>}
        <div className="mt-4 flex items-center gap-3">
          <CheersButton sessionId={item.id} count={item.cheers} cheered={item.cheeredByMe} />
          {isMine && <DeleteSesh sessionId={item.id} />}
        </div>
      </div>
    </article>
  )
}
