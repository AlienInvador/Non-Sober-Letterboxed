import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SplitRatingCard } from '@/components/split-rating-card'

const s = (influence: 'drunk' | 'high' | 'both' | 'sober', logCount: number, recommendPct: number | null, avgRating: number | null = 4) => ({
  influence, logCount, recommendPct, avgRating,
})

describe('SplitRatingCard', () => {
  it('always shows High, Drunk, Drunk + high; no sober at 0 logs', () => {
    render(<SplitRatingCard stats={[]} />)
    expect(screen.getByText('High')).toBeTruthy()
    expect(screen.getByText('Drunk')).toBeTruthy()
    expect(screen.getByText('Drunk + high')).toBeTruthy()
    expect(screen.queryByText(/sober/i)).toBeNull()
    expect(screen.getAllByText('—').length).toBe(3)
  })
  it('shows sober line when logged, and pct', () => {
    render(<SplitRatingCard stats={[s('high', 3, 66.67), s('sober', 2, null)]} />)
    expect(screen.getByText('67%')).toBeTruthy()
    expect(screen.getByText(/Sober/)).toBeTruthy()
    expect(screen.getByText(/4 avg · 3 logs/)).toBeTruthy()
  })
})
