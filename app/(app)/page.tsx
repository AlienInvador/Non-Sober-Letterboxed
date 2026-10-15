import Link from 'next/link'
import { unstable_rethrow } from 'next/navigation'
import { getFeed, getHero, getHittingTonight, getQueue } from '@/lib/queries/feed'
import { createServerClient } from '@/lib/supabase/server'
import { posterUrl } from '@/lib/tmdb'
import { formatRecommendPct } from '@/lib/stats'
import { influenceLabel } from '@/lib/influence'
import { tokens } from '@/design/tokens'
import { SessionCard } from '@/components/session-card'
import { EmptyState } from '@/components/empty-state'
import { InviteLink } from '@/components/invite-link'
import { HeroActions } from '@/components/hero-actions'
import { InfluenceDot } from '@/components/influence-chip'

export default async function Tonight() {
  let data
  try {
    const hitting = await getHittingTonight()
    const [feed, queue, hero] = await Promise.all([getFeed(), getQueue(), getHero(hitting)])
    const sb = await createServerClient()
    const { data: auth } = await sb.auth.getUser()
    const { data: prof } = await sb.from('profiles').select('username').eq('id', auth.user!.id).single()
    data = { feed, queue, hero, username: prof?.username ?? '' }
  } catch (e) {
    unstable_rethrow(e)
    return (
      <main className="p-10">
        <h1 className="font-display text-3xl">Couldn&apos;t load Tonight</h1>
        <p className="mt-2 text-muted">Try again in a moment.</p>
      </main>
    )
  }
  const { feed, queue, hero, username } = data
  const backdrop = hero && posterUrl(hero.backdropPath, 'w1280')

  return (
    <main className="mx-auto max-w-3xl px-6 py-8 md:px-10">
      <h1 className="sr-only">Tonight</h1>
      {hero && (
        <section
          className="relative flex min-h-[440px] flex-col justify-end overflow-hidden rounded-hero bg-card p-8"
          style={backdrop ? { backgroundImage: `url(${backdrop})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" />
          <div className="relative">
            <p className="font-note text-2xl text-note">{hero.eyebrow}</p>
            <h2 className="font-display mt-1 text-5xl">{hero.movie.title}</h2>
            {hero.pct !== null && (
              <p className="mt-2 font-mono text-sm text-body">
                {formatRecommendPct(hero.pct)} say watch it {influenceLabel(hero.influence).toLowerCase()}
              </p>
            )}
            <HeroActions movie={hero.movie} />
          </div>
        </section>
      )}

      {queue.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-2xl">Up next in your queue</h2>
          <ul className="mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
            {queue.map(({ movie, influence, pct }) => {
              const poster = posterUrl(movie.posterPath, 'w342')
              return (
                <li key={movie.tmdbId} className="w-[184px] shrink-0 snap-start">
                  <Link href={`/movie/${movie.tmdbId}`} className="block">
                    <span className="block aspect-[2/3] overflow-hidden rounded-poster bg-raised">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {poster && <img src={poster} alt="" className="size-full object-cover" />}
                    </span>
                    <span className="mt-2 block font-medium">{movie.title}</span>
                  </Link>
                  {influence && pct !== null && (
                    <p className="mt-1 flex items-center gap-2 font-mono text-xs" style={{ color: tokens.color[influence] }}>
                      <InfluenceDot influence={influence} />
                      {formatRecommendPct(pct)} say {influenceLabel(influence).toLowerCase()}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section className="mt-12">
        <h2 className="font-display text-2xl">Your people&apos;s seshes</h2>
        {feed.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="Log your first sesh">
              <p>Seshes from you and your friends show up here. Invite someone to get it going.</p>
              <InviteLink username={username} />
            </EmptyState>
          </div>
        ) : (
          <div className="mt-2">
            {feed.map((item, i) => <SessionCard key={item.id} item={item} index={i} />)}
          </div>
        )}
      </section>
    </main>
  )
}
