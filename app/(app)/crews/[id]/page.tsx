import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCrewPage } from '@/lib/queries/crews'
import { getFeed } from '@/lib/queries/feed'
import { posterUrl } from '@/lib/tmdb'
import { SessionCard } from '@/components/session-card'
import { AddMemberForm, MemberButton } from '@/components/crew-forms'

export default async function CrewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const page = await getCrewPage(id)
  if (!page) notFound()
  const { crew, members, topPicks, isOwner, me } = page
  const feed = await getFeed({ crewId: id })
  return (
    <main className="mx-auto max-w-3xl px-6 py-8 md:px-10">
      <h1 className="font-display text-4xl">{crew.name}</h1>

      <section className="mt-10">
        <h2 className="font-display text-2xl">Members</h2>
        <ul className="mt-2">
          {members.map((m) => (
            <li key={m.profile.id} className="flex items-center gap-3 border-b border-line py-3">
              <Link href={`/u/${m.profile.username}`} className="flex-1">
                {m.profile.displayName || m.profile.username}
                <span className="ml-2 text-sm text-muted">@{m.profile.username}</span>
              </Link>
              {m.role === 'owner' && <span className="font-mono text-xs text-muted">owner</span>}
              {(isOwner || m.profile.id === me) && <MemberButton crewId={id} userId={m.profile.id} self={m.profile.id === me} />}
            </li>
          ))}
        </ul>
        {isOwner && <AddMemberForm crewId={id} />}
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl">Crew top picks</h2>
        {topPicks.length === 0 ? (
          <p className="mt-2 text-muted">No recommendations yet.</p>
        ) : (
          <ol className="mt-3 flex gap-4 overflow-x-auto">
            {topPicks.map(({ movie, count }) => {
              const poster = posterUrl(movie.posterPath, 'w185')
              return (
                <li key={movie.tmdbId} className="w-[120px] shrink-0">
                  <Link href={`/movie/${movie.tmdbId}`}>
                    <span className="block aspect-[2/3] overflow-hidden rounded-poster bg-raised">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {poster && <img src={poster} alt="" className="size-full object-cover" />}
                    </span>
                    <span className="mt-2 block text-sm">{movie.title}</span>
                  </Link>
                  <span className="font-mono text-xs text-muted">{count} recommend</span>
                </li>
              )
            })}
          </ol>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl">Shared lists</h2>
        <p className="mt-2 text-muted">Shared lists coming soon</p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl">Crew seshes</h2>
        {feed.length === 0 ? (
          <p className="mt-2 text-muted">Nothing logged to this crew yet.</p>
        ) : (
          feed.map((item, i) => <SessionCard key={item.id} item={item} index={i} />)
        )}
      </section>
    </main>
  )
}
