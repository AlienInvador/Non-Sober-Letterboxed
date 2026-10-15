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
      className={`inline-flex items-center justify-center gap-2 rounded-control px-4 text-sm font-medium transition-[color,background-color,rotate,translate] duration-250 ease-out-soft hover:-rotate-3 hover:-translate-y-0.5 focus-visible:-rotate-3 focus-visible:-translate-y-0.5 motion-reduce:hover:rotate-0 motion-reduce:hover:translate-y-0 motion-reduce:focus-visible:rotate-0 motion-reduce:focus-visible:translate-y-0 ${
        size === 'lg' ? 'h-[52px]' : 'h-10'
      } ${selected ? 'bg-selected text-text' : 'bg-transparent text-muted'}`}
    >
      <InfluenceDot influence={influence} />
      {influenceLabel(influence)}
    </button>
  )
}
