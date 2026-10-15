import Link from 'next/link'
import type { FeedItem } from '@/lib/queries/feed'
import { posterUrl } from '@/lib/tmdb'
import { influenceLabel } from '@/lib/influence'
import { relativeTime } from '@/lib/time'
import { tokens } from '@/design/tokens'
import { InfluenceDot } from '@/components/influence-chip'
import { CheersButton } from '@/components/cheers-button'

const WHEN = { drunk: 'drunk', high: 'high', both: 'drunk and high', sober: '' }
const verdict = (i: FeedItem) =>
  i.recommend === null || i.influence === 'sober' ? null : `${i.recommend ? 'Recommends it' : 'Would skip it'} ${WHEN[i.influence]}`

export function SessionCard({ item, index = 0 }: { item: FeedItem; index?: number }) {
  const poster = posterUrl(item.movie.posterPath, 'w185')
  const color = tokens.color[item.influence]
  return (
    <article
      className="rise group flex gap-5 border-b border-line py-6 last:border-b-0"
      style={{ '--i': index } as React.CSSProperties}
    >
      <Link href={`/movie/${item.movie.tmdbId}`} className="block h-[162px] w-[108px] shrink-0 overflow-hidden rounded-poster bg-raised">
        {poster && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt={item.movie.title} className="size-full object-cover" />
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-muted">
          <Link href={`/u/${item.profile.username}`} className="text-text underline underline-offset-2">{item.profile.username}</Link>
          {' · '}
          <span className="font-mono text-xs">{relativeTime(item.createdAt)}</span>
        </p>
        <h3 className="font-display mt-1 text-2xl">{item.movie.title}</h3>
        <p className="mt-2 flex items-center gap-2 text-sm" style={{ color }}>
          <InfluenceDot influence={item.influence} />
          {influenceLabel(item.influence)}
          {verdict(item) && <span>· {verdict(item)}</span>}
        </p>
        {item.review && <p className="mt-3 text-[17px] leading-[1.7] text-body">{item.review}</p>}
        <div className="mt-4">
          <CheersButton sessionId={item.id} count={item.cheers} cheered={item.cheeredByMe} />
        </div>
      </div>
    </article>
  )
}
