'use client'
import { recommendLabel, type Influence } from '@/lib/influence'

export function RecommendToggle({
  influence, value, onChange,
}: { influence: Influence; value: boolean | null; onChange: (v: boolean) => void }) {
  const label = recommendLabel(influence)
  if (!label) return null
  const on = value === true
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onChange(!on)}
        className={`relative h-7 w-12 rounded-full transition-colors duration-150 ${on ? 'bg-accent-fill' : 'bg-track'}`}
      >
        <span className={`absolute top-1 left-1 size-5 rounded-full bg-text transition-transform duration-150 ${on ? 'translate-x-5' : ''}`} />
      </button>
      <span className="text-sm text-body">{label}</span>
    </div>
  )
}
