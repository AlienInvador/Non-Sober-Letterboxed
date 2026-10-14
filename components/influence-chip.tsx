'use client'
import { influenceLabel, type Influence } from '@/lib/influence'
import { tokens } from '@/design/tokens'

export function InfluenceDot({ influence }: { influence: Influence }) {
  const background = influence === 'both' ? tokens.gradient.bothDot : tokens.color[influence]
  return <span aria-hidden className="inline-block size-2 rounded-full" style={{ background }} />
}

export function InfluenceChip({
  influence, selected = false, onToggle, size = 'sm',
}: { influence: Influence; selected?: boolean; onToggle?: () => void; size?: 'sm' | 'lg' }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={`inline-flex items-center justify-center gap-2 rounded-control px-4 text-sm font-medium transition-colors duration-150 ${
        size === 'lg' ? 'h-[52px]' : 'h-10'
      } ${selected ? 'bg-selected text-text' : 'bg-transparent text-muted'}`}
    >
      <InfluenceDot influence={influence} />
      {influenceLabel(influence)}
    </button>
  )
}
