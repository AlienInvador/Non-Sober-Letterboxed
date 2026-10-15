import Link from 'next/link'
import { CouchArt } from '@/components/line-art'
import { Marquee } from '@/components/marquee'
import { PosterFan } from '@/components/poster-fan'
import { posterUrl, type Movie } from '@/lib/tmdb'
import { Reveal } from './reveal'

export type Pick = { title: string; tmdbId: number; influence: 'drunk' | 'high' | 'both'; pct: number; movie: Movie | null }

const WRAP = 'mx-auto w-full max-w-[1200px] px-[clamp(16px,4vw,48px)]'
const BTN =
  'inline-flex h-[52px] items-center justify-center rounded-full px-[26px] text-base font-semibold transition-transform duration-200 ease-out-soft hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0'
const EYEBROW = 'font-mono text-[13px] text-note'
const H2 = 'font-display font-semibold leading-[1.02] tracking-[-0.025em] text-[clamp(36px,5vw,56px)]'
const LEAD = 'max-w-[460px] text-lg leading-[1.7] text-muted'

const STEPS = [
  ['01', 'Pick your state', 'Drunk, high, or both. Sober works too, we won’t judge.'],
  ['02', 'Say if it hit', 'One honest tap: would you watch it like this again?'],
  ['03', 'Share with your people', 'Tag who was on the couch. Your crew sees it, strangers don’t.'],
]
const BARS = [
  ['High', 92, '#B6FF3B', '#B6FF3B'],
  ['Drunk', 71, '#FF2E88', '#FF2E88'],
  ['Both', 64, 'linear-gradient(90deg,#FF2E88 50%,#B6FF3B 50%)', 'linear-gradient(90deg,#FF2E88,#B6FF3B)'],
] as const

export function Landing({ picks }: { picks: Pick[] }) {
  const fan = picks
    .filter((p) => p.movie?.posterPath)
    .slice(0, 5)
    .map((p) => ({ title: p.movie!.title, posterPath: p.movie!.posterPath }))
  const fanItems = fan.length === 5 ? fan : picks.slice(0, 5).map((p) => ({ title: p.movie?.title ?? p.title, posterPath: p.movie?.posterPath ?? null }))
  const ticker = picks.map((p) => ({ title: p.movie?.title ?? p.title, stat: `${p.pct}% ${p.influence}` }))
  const inception = picks.find((p) => p.tmdbId === 27205)
  const incPoster = posterUrl(inception?.movie?.posterPath ?? null, 'w185')

  return (
    <main className="overflow-hidden bg-bg text-text">
      <header className={`${WRAP} flex h-[84px] flex-wrap items-center justify-between gap-4`}>
        <span className="font-display text-[26px] font-bold tracking-[-0.015em]">geeked-drunk</span>
        <nav aria-label="Site" className="flex flex-wrap gap-7 text-[15px] font-medium">
          <a href="#how" className="text-body hover:text-text">How it works</a>
          <a href="#crews" className="text-body hover:text-text">Crews</a>
        </nav>
        <Link href="/auth/login" className={`${BTN} !h-11 bg-accent-fill !px-5 text-white`}>Get in</Link>
      </header>

      <section className={`${WRAP} rise flex flex-col items-center gap-[22px] pt-[72px] text-center`}>
        <span className="font-note text-[28px] font-semibold text-note">for the couch crowd</span>
        <h1 className="max-w-[1100px] font-display text-[clamp(52px,9vw,128px)] font-semibold leading-[.95] tracking-[-0.035em]">
          Movies hit different drunk or high.
        </h1>
        <p className="mt-1.5 max-w-[560px] text-xl leading-[1.6] text-muted">
          The movie log for people who watch with a drink, a joint, or both. Say if it hit in that state, share it with your crew, and find what hits tonight.
        </p>
        <div className="mt-2.5 flex flex-wrap justify-center gap-3">
          <Link href="/auth/login" className={`${BTN} bg-accent-fill text-white`}>Pull up a cushion</Link>
          <Link href="/discover" className={`${BTN} bg-raised text-text`}>See tonight’s picks</Link>
        </div>
      </section>

      <div className={`${WRAP} rise mt-[72px]`} style={{ ['--i' as string]: 4 }}>
        <PosterFan items={fanItems} />
      </div>

      <Marquee items={ticker} />

      <Reveal id="how" className={`${WRAP} mt-[140px] flex flex-col gap-12`}>
        <div className="flex max-w-[640px] flex-col gap-3">
          <span className={EYEBROW}>How it works</span>
          <h2 className="font-display text-[clamp(36px,5vw,60px)] font-semibold leading-[1.02] tracking-[-0.025em]">Three taps, then back to the movie.</h2>
        </div>
        <ol className="grid list-none grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-10 p-0">
          {STEPS.map(([n, t, b]) => (
            <li key={n} className="flex flex-col gap-3.5 border-t border-text/10 pt-6">
              <span className="font-display text-[72px] font-light leading-none text-faint">{n}</span>
              <h3 className="font-display text-2xl font-semibold leading-tight">{t}</h3>
              <p className="text-base leading-[1.7] text-muted">{b}</p>
            </li>
          ))}
        </ol>
      </Reveal>

      <Reveal className={`${WRAP} mt-40 flex flex-wrap items-center gap-14`}>
        <div className="flex flex-[1_1_380px] flex-col gap-5">
          <span className={EYEBROW}>How it hits</span>
          <h2 className={H2}>One movie. Three very different nights.</h2>
          <p className={LEAD}>Every recommend is split by how people watched. So you know if it’s a masterpiece high, a mess drunk, or both at once.</p>
          <ul className="mt-2 flex list-none flex-col p-0">
            {['Recommend % split by drunk, high, or both', '“Would you recommend it in that state?” in one tap', 'Rankings for whatever tonight looks like'].map((t, i) => (
              <li key={t} className="flex gap-4 border-t border-text/10 py-3.5 text-base last:border-b">
                <span className="font-mono text-faint">0{i + 1}</span>
                {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="box-border flex min-h-[460px] flex-[1_1_440px] items-center justify-center rounded-[32px] bg-raised p-10">
          <div className="flex w-full max-w-[400px] flex-col gap-[22px]">
            <div className="flex items-center gap-4">
              {incPoster ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={incPoster} alt="Inception poster" className="aspect-[2/3] w-[72px] flex-none rounded-poster object-cover" />
              ) : (
                <div aria-hidden="true" className="aspect-[2/3] w-[72px] flex-none rounded-poster bg-card" />
              )}
              <div className="flex flex-col gap-1">
                <h3 className="font-display text-[26px] font-semibold">Inception</h3>
                <span className="text-sm text-muted">2010 · Christopher Nolan</span>
              </div>
            </div>
            {BARS.map(([label, pct, dot, fill]) => (
              <div key={label} className="flex flex-col gap-2">
                <div className="flex justify-between text-sm">
                  <span className="inline-flex items-center gap-2">
                    <span aria-hidden="true" className="size-2 rounded-full" style={{ background: dot }} />
                    {label}
                  </span>
                  <span className="font-mono font-bold">{pct}% recommend it</span>
                </div>
                <div aria-hidden="true" className="h-2 rounded-[9px] bg-bg">
                  <div className="h-2 rounded-[9px]" style={{ width: `${pct}%`, background: fill }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal id="crews" className={`${WRAP} mt-40 flex flex-wrap-reverse items-center gap-14`}>
        <div className="box-border flex flex-[1_1_440px] justify-center rounded-[32px] bg-card px-8 pb-8 pt-12">
          <CouchArt title="Line drawing of friends on a couch with a glass and a curl of smoke" />
        </div>
        <div className="flex flex-[1_1_380px] flex-col gap-5">
          <span className={EYEBROW}>Crews</span>
          <h2 className={H2}>Your couch, your crew, your list.</h2>
          <p className={LEAD}>Start a crew for movie night. Share a feed, build a queue together, and tag who was there. Private by default.</p>
          <p className="mt-2 font-note text-[30px] font-semibold leading-[1.3] text-note">
            &quot;we finally stopped arguing about what to put on.&quot; <span className="text-[22px] text-muted">— couch club</span>
          </p>
        </div>
      </Reveal>

      <Reveal className={`${WRAP} mt-[180px] flex flex-col items-center gap-[22px] pb-16 text-center`}>
        <h2 className="font-display text-[clamp(44px,7vw,96px)] font-semibold leading-[.98] tracking-[-0.03em]">Pull up a cushion.</h2>
        <p className="text-lg leading-[1.7] text-muted">21 and over. Know your limits, never drive after, look out for each other.</p>
        <Link href="/auth/login" className={`${BTN} mt-1.5 bg-accent-fill text-white`}>Get in</Link>
      </Reveal>
    </main>
  )
}
