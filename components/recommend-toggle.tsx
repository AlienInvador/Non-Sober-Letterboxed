'use client'
import { recommendLabel, type Influence } from '@/lib/influence'

export function RecommendToggle({
  influence, value, onChange,
}: { influence: Influence; value: boolean | null; onChange: (v: boolean) => void }) {
  const label = recommendLabel(influence)
  if (!label) return null
  const state = label.slice('Recommend it '.length, -1) // drunk | high | drunk and high
  const pill = (v: boolean, text: string) => (
    <button
      type="button"
      aria-pressed={value === v}
      aria-label={`${text} ${state}`}
      onClick={() => onChange(v)}
      className={`flex-1 rounded-control px-3 py-2 text-sm ${value === v ? 'bg-selected text-text' : 'text-muted'}`}
    >
      {text}
    </button>
  )
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-2">
      <span className="text-sm text-muted">{label}</span>
      <div className="flex gap-1 rounded-control bg-card p-1">
        {pill(true, 'Yes, recommend it')}
        {pill(false, 'Nah, skip it')}
      </div>
    </div>
  )
}
