import { InfluenceDot } from '@/components/influence-chip'
import { formatRecommendPct } from '@/lib/stats'
import type { InfluenceStat } from '@/lib/queries/movie'
import type { Influence } from '@/lib/influence'

const COLS: { influence: Influence; label: string; verb: string }[] = [
  { influence: 'high', label: 'High', verb: 'high' },
  { influence: 'drunk', label: 'Drunk', verb: 'drunk' },
  { influence: 'both', label: 'Drunk + high', verb: 'both' },
]

export function HowItHits({ stats }: { stats: InfluenceStat[] }) {
  const get = (i: Influence) => stats.find((s) => s.influence === i)
  const sober = get('sober')
  return (
    <div>
      <div className="grid grid-cols-1 divide-line sm:grid-cols-3 sm:divide-x">
        {COLS.map((c) => {
          const s = get(c.influence)
          return (
            <div key={c.influence} className="py-3 sm:px-6 sm:first:pl-0">
              <div className="flex items-center gap-2 text-sm text-muted">
                <InfluenceDot influence={c.influence} />
                <span>{c.label}</span>
              </div>
              <div className="mt-2 font-mono text-5xl text-text">{formatRecommendPct(s?.recommendPct ?? null)}</div>
              <div className="mt-1 text-sm text-body">recommend it {c.verb}</div>
              <div className="mt-1 text-xs text-faint">
                {s?.logCount ?? 0} logs
              </div>
            </div>
          )
        })}
      </div>
      {sober && sober.logCount > 0 && (
        <p className="mt-3 text-xs text-muted">
          Sober: {sober.logCount} logs
        </p>
      )}
    </div>
  )
}
