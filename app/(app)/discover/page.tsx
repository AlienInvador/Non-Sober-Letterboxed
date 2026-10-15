import Link from 'next/link'
import { getDiscover, type DiscoverTab } from '@/lib/queries/discover'
import { formatRecommendPct } from '@/lib/stats'
import { influenceLabel } from '@/lib/influence'
import { InfluenceDot } from '@/components/influence-chip'
import { GenreSelect } from '@/components/genre-select'
import { LogButton } from '@/components/log-sheet'
import { PosterTile } from '@/components/poster-tile'
import { tokens } from '@/design/tokens'

const TABS: DiscoverTab[] = ['high', 'drunk', 'both']

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<{ tab?: string; genre?: string }> }) {
  const sp = await searchParams
  const tab = TABS.find((t) => t === sp.tab) ?? 'high'
  const genre = sp.genre ?? ''
  const { rows, trending, genres } = await getDiscover(tab, genre || undefined)
  const color = tab === 'both' ? tokens.color.both : tokens.color[tab]

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <p className="font-note text-xl text-note">can&apos;t decide? the crowd has opinions.</p>
      <h1 className="font-display text-4xl">What should we watch tonight?</h1>
      <p className="mt-2 text-sm text-muted">Ranked by how many people recommend it in that state. Five public logs minimum.</p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div role="tablist" className="inline-flex gap-1 rounded-full bg-card p-1">
          {TABS.map((t) => (
            <Link
              key={t} role="tab" aria-selected={t === tab}
              href={`/discover?tab=${t}${genre ? `&genre=${encodeURIComponent(genre)}` : ''}`}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm ${t === tab ? 'bg-selected text-text' : 'text-muted'}`}
            >
              <InfluenceDot influence={t} />Best {influenceLabel(t).toLowerCase()}
            </Link>
          ))}
        </div>
        <GenreSelect tab={tab} genre={genre} genres={genres} />
      </div>

      {rows.length === 0 ? (
        <div className="mt-10 flex flex-col items-start gap-4">
          <p className="text-muted">Not enough seshes yet. Log a few and this fills up.</p>
          <LogButton />
        </div>
      ) : (
        <ol className="mt-6 divide-y divide-line">
          {rows.map((r, i) => (
            <li key={r.movie.tmdbId} className="rise flex items-center gap-4 py-4" style={{ '--i': i } as React.CSSProperties}>
              <span className="w-6 font-mono text-sm text-faint">{i + 1}</span>
              <div className="w-[72px] shrink-0"><PosterTile movie={r.movie} href={`/movie/${r.movie.tmdbId}`} /></div>
              <div className="min-w-0 flex-1">
                <Link href={`/movie/${r.movie.tmdbId}`} className="font-display text-lg">{r.movie.title}</Link>
                <p className="text-sm text-muted">{[r.movie.year, r.genre].filter(Boolean).join(' · ')}</p>
                {r.friends && <p className="text-xs text-note">{r.friends.recommend} of {r.friends.total} friends recommend it</p>}
              </div>
              <div className="text-right font-mono">
                <div className="text-lg" style={{ color }}>{formatRecommendPct(r.recommendPct)}</div>
                <div className="text-xs text-muted">{r.logCount} logs</div>
              </div>
            </li>
          ))}
        </ol>
      )}

      {trending.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-2xl">Trending with friends</h2>
          <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
            {trending.map((t) => (
              <div key={t.movie.tmdbId} className="w-28 shrink-0">
                <PosterTile movie={t.movie} href={`/movie/${t.movie.tmdbId}`} />
                <p className="mt-1 text-xs text-muted">{t.friendCount} {t.friendCount === 1 ? 'friend' : 'friends'} watched</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
