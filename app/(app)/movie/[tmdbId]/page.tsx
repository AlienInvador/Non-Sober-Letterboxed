import Link from 'next/link'
import { notFound, unstable_rethrow } from 'next/navigation'
import { getFriendVerdicts, getMoviePage } from '@/lib/queries/movie'
import { posterUrl } from '@/lib/tmdb'
import { influenceLabel, normalizeInfluenceFilter, stateWord, verdict } from '@/lib/influence'
import { tokens } from '@/design/tokens'
import { HowItHits } from '@/components/how-it-hits'
import { AvatarStack } from '@/components/avatar-stack'
import { InfluenceDot } from '@/components/influence-chip'
import { isQueued } from '@/lib/queries/lists'
import { MovieActions } from '@/components/movie-actions'

const FILTERS = [
  { key: 'all', label: 'All' }, { key: 'high', label: 'High' }, { key: 'drunk', label: 'Drunk' }, { key: 'both', label: 'Both' },
]

export default async function MoviePage({
  params, searchParams,
}: { params: Promise<{ tmdbId: string }>; searchParams: Promise<{ influence?: string }> }) {
  const { tmdbId } = await params
  if (!/^\d+$/.test(tmdbId)) notFound()
  const influence = normalizeInfluenceFilter((await searchParams).influence)

  let data
  try {
    const [page, friendVerdicts, queued] = await Promise.all([getMoviePage(Number(tmdbId)), getFriendVerdicts(Number(tmdbId)), isQueued(Number(tmdbId))])
    data = { ...page, friendVerdicts, queued }
  } catch (e) {
    unstable_rethrow(e)
    return (
      <main className="p-10">
        <h1 className="font-display text-3xl">Couldn&apos;t load this movie</h1>
        <p className="mt-2 text-muted">Try again in a moment.</p>
      </main>
    )
  }
  const { movie, stats, friends, reviews, friendVerdicts, queued } = data
  const poster = posterUrl(movie.posterPath, 'w342')
  const backdrop = posterUrl(movie.backdropPath, 'w1280')
  const meta = [
    movie.year, movie.runtime ? `${Math.floor(movie.runtime / 60)} h ${movie.runtime % 60} min` : null,
    movie.genres.join(', ') || null,
  ].filter(Boolean).join(' · ')
  const shown = reviews.filter((r) => influence === 'all' || r.influence === influence)

  return (
    <main className="pb-20">
      <div className="relative h-[480px] bg-raised">
        {backdrop && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={backdrop} alt="" className="size-full object-cover" />
        )}
        <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, transparent 30%, ${tokens.color.bg})` }} />
      </div>
      <div className="relative -mt-40 flex flex-wrap items-end gap-8 px-6 sm:px-10">
        <div className="aspect-[2/3] w-[220px] shrink-0 overflow-hidden rounded-[8px] bg-raised shadow-[0_20px_40px_rgba(0,0,0,.45)]">
          {poster && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={poster} alt={`${movie.title} poster`} className="size-full object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1 basis-72">
          <h1 className="font-display text-[clamp(38px,6vw,60px)] leading-none tracking-[-0.03em]">{movie.title}</h1>
          <p className="mt-3 text-muted">{meta}</p>
          {friendVerdicts.length > 0 && (
            <ul aria-label="Your friends' verdicts" className="mt-3 space-y-1 text-sm text-body">
              {friendVerdicts.map((v) => (
                <li key={v.influence} className="flex items-center gap-2">
                  <InfluenceDot influence={v.influence} />
                  {v.recommendCount} of {v.total} {v.total === 1 ? 'friend recommends' : 'friends recommend'} it {stateWord(v.influence)}
                </li>
              ))}
            </ul>
          )}
          <MovieActions movie={movie} queued={queued} />
        </div>
      </div>

      <div className="mt-14 space-y-14 px-6 sm:px-10">
        <section aria-labelledby="hits">
          <h2 id="hits" className="mb-4 font-display text-2xl">How it hits</h2>
          <HowItHits stats={stats} />
        </section>

        {friends.length > 0 && (
          <section aria-labelledby="people">
            <h2 id="people" className="mb-4 font-display text-2xl">Your people watched it</h2>
            <AvatarStack friends={friends} />
          </section>
        )}

        <section aria-labelledby="reviews">
          <h2 id="reviews" className="mb-4 font-display text-2xl">Public reviews</h2>
          <nav aria-label="Filter reviews" className="mb-4 inline-flex rounded-control bg-card p-1">
            {FILTERS.map((f) => (
              <Link
                key={f.key}
                href={f.key === 'all' ? '?' : `?influence=${f.key}`}
                aria-current={influence === f.key ? 'true' : undefined}
                className={`rounded-[8px] px-4 py-1.5 text-sm ${influence === f.key ? 'bg-selected text-text' : 'text-muted'}`}
              >
                {f.label}
              </Link>
            ))}
          </nav>
          {shown.length === 0 ? (
            <p className="text-muted">No reviews yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {shown.map((r, i) => (
                <li key={r.id} className="rise py-5" style={{ '--i': i } as React.CSSProperties}>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-text">{r.profile.username}</span>
                    <span className="flex items-center gap-1.5 text-muted">
                      <InfluenceDot influence={r.influence} />
                      {influenceLabel(r.influence)}
                    </span>
                    <span className="text-muted">{verdict(r.recommend)}</span>
                  </div>
                  <p className="mt-2 leading-[1.7] text-body">{r.review}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  )
}
