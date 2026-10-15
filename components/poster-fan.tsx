import { posterUrl } from '@/lib/tmdb'

export type FanItem = { title: string; posterPath: string | null }
const LAYOUT = [
  { bg: '#5B3A8C', r: -9 },
  { bg: '#7A3B4F', r: -4 },
  { bg: '#2F5A4A', r: 0 },
  { bg: '#6B5A2E', r: 5 },
  { bg: '#3B4A6B', r: 10 },
]

export function PosterFan({ items }: { items: FanItem[] }) {
  return (
    <div className="relative h-[460px]">
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[300px] rounded-[32px] bg-raised" />
      {items.slice(0, 5).map((p, i) => {
        const l = LAYOUT[i]
        const src = posterUrl(p.posterPath, 'w342')
        return (
          <div
            key={p.title}
            className="absolute bottom-10 flex aspect-[2/3] w-[clamp(96px,14vw,170px)] items-end overflow-hidden rounded-lg p-3 text-xs font-semibold text-text/75 shadow-[0_24px_48px_rgba(0,0,0,.35)]"
            style={{ left: `${22 + i * 11}%`, background: l.bg, transform: `rotate(${l.r}deg)`, zIndex: i === 2 ? 5 : 4 - Math.abs(2 - i) }}
          >
            {src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt={`${p.title} poster`} className="absolute inset-0 size-full object-cover" />
            ) : (
              p.title
            )}
          </div>
        )
      })}
      <div className="absolute right-[4%] top-[26px] z-[9] flex w-[min(300px,70%)] rotate-2 flex-col gap-1.5 rounded-[18px] bg-text px-5 py-[18px] text-bg shadow-[0_24px_48px_rgba(0,0,0,.35)]">
        <span className="text-[13px] font-semibold text-[#6E6259]">maya logged · 11:42 pm</span>
        <span className="font-display text-[22px] font-semibold leading-tight">Paprika</span>
        <span className="inline-flex items-center gap-2 text-sm font-semibold">
          <span className="size-2 rounded-full bg-[#5E8C1A]" />
          High · recommends
        </span>
        <span className="font-note text-xl font-semibold text-[#5B3A8C]">&quot;the parade scene!!&quot;</span>
      </div>
      <div className="absolute left-[3%] top-[60px] z-[9] flex -rotate-2 gap-[18px] rounded-2xl bg-card px-[18px] py-3.5 shadow-[0_18px_40px_rgba(0,0,0,.3)]">
        <span className="flex flex-col"><span className="font-mono text-[26px] font-bold">92%</span><span className="text-xs text-muted">say watch it high</span></span>
        <span className="flex flex-col"><span className="font-mono text-[26px] font-bold">71%</span><span className="text-xs text-muted">say watch it drunk</span></span>
      </div>
    </div>
  )
}
