import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HowItHits } from '@/components/how-it-hits'

const s = (influence: 'drunk' | 'high' | 'both' | 'sober', logCount: number, recommendPct: number | null) => ({
  influence, logCount, recommendPct,
})

describe('HowItHits', () => {
  it('always shows High, Drunk, Drunk + high; no sober at 0 logs', () => {
    render(<HowItHits stats={[]} />)
    expect(screen.getByText('High')).toBeTruthy()
    expect(screen.getByText('Drunk')).toBeTruthy()
    expect(screen.getByText('Drunk + high')).toBeTruthy()
    expect(screen.queryByText(/sober/i)).toBeNull()
    expect(screen.getAllByText('—').length).toBe(3)
  })
  it('shows sober line when logged, and pct', () => {
    render(<HowItHits stats={[s('high', 3, 66.67), s('sober', 2, null)]} />)
    expect(screen.getByText('67%')).toBeTruthy()
    expect(screen.getByText(/Sober/)).toBeTruthy()
    expect(screen.getByText('3 logs')).toBeTruthy()
  })
})
