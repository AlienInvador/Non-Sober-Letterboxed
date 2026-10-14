'use client'
import type { KeyboardEvent } from 'react'
import { tokens } from '@/design/tokens'
import type { Influence } from '@/lib/influence'

const STAR = 'M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01z'

export function NeonStars({
  value, onChange, influence,
}: { value: number | null; onChange?: (v: number | null) => void; influence: Influence }) {
  const fill = tokens.color[influence]
  const v = value ?? 0
  const step = (d: number) => onChange?.(Math.min(5, Math.max(0.5, v + d)))
  const onKey = (e: KeyboardEvent) => {
    if (!onChange) return
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') step(0.5)
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') step(-0.5)
    else return
    e.preventDefault()
  }
  const pick = (n: number) => onChange?.(n === value ? n - 0.5 : n)
  return (
    <div
      role="slider"
      aria-label="Rating"
      aria-valuemin={0}
      aria-valuemax={5}
      aria-valuenow={v}
      aria-readonly={!onChange}
      tabIndex={0}
      onKeyDown={onKey}
      className="inline-flex gap-1"
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className="relative inline-block size-8">
          <Star color={tokens.color.track} />
          <span className="absolute inset-0 overflow-hidden" style={{ width: `${Math.max(0, Math.min(1, v - (n - 1))) * 100}%` }}>
            <Star color={fill} />
          </span>
          {onChange && (
            <>
              <span data-testid={`star-${n - 0.5}`} className="absolute inset-y-0 left-0 w-1/2 cursor-pointer" onClick={() => pick(n - 0.5)} />
              <span data-testid={`star-${n}`} className="absolute inset-y-0 right-0 w-1/2 cursor-pointer" onClick={() => pick(n)} />
            </>
          )}
        </span>
      ))}
    </div>
  )
}

function Star({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" className="size-8 max-w-none" aria-hidden>
      <path d={STAR} fill={color} />
    </svg>
  )
}
