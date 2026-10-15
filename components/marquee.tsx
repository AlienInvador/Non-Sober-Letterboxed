export type Tick = { title: string; stat: string }

function Row({ items, hidden }: { items: Tick[]; hidden?: boolean }) {
  return (
    <div className={`marquee-row flex flex-wrap gap-y-2${hidden ? " marquee-dup" : ""}`} aria-hidden={hidden || undefined}>
      {items.map((t) => (
        <span key={t.title} className="inline-flex items-center gap-[18px] whitespace-nowrap pr-9 font-display text-[30px] font-medium italic text-white">
          {t.title} <span className="font-mono text-base not-italic">{t.stat}</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" aria-hidden="true">
            <path d="M12 2v20M2 12h20M5 5l14 14M19 5L5 19" />
          </svg>
        </span>
      ))}
    </div>
  )
}

export function Marquee({ items }: { items: Tick[] }) {
  return (
    <section aria-label="Tonight's ticker" className="relative mt-[120px]">
      <svg aria-hidden="true" viewBox="0 0 1440 40" preserveAspectRatio="none" className="block h-10 w-full">
        <path d="M0 40 C 240 0, 480 0, 720 20 S 1200 40, 1440 6 L1440 40 Z" fill="#7444EC" />
      </svg>
      <div className="overflow-hidden bg-accent-fill py-[22px]">
        <div className="marquee-track" data-testid="marquee-track">
          <Row items={items} />
          <Row items={items} hidden />
        </div>
      </div>
      <svg aria-hidden="true" viewBox="0 0 1440 40" preserveAspectRatio="none" className="block h-10 w-full">
        <path d="M0 0 C 300 40, 600 30, 860 12 S 1260 0, 1440 30 L1440 0 Z" fill="#7444EC" />
      </svg>
    </section>
  )
}
