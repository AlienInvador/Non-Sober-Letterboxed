import { describe, it, expect } from 'vitest'
import { influenceBreakdown } from '@/lib/profile-stats'

const rows = (...i: ('high' | 'drunk' | 'both' | 'sober')[]) => i.map((influence) => ({ influence }))

describe('influenceBreakdown', () => {
  it('3 high + 1 drunk', () => {
    expect(influenceBreakdown(rows('high', 'high', 'high', 'drunk'))).toEqual({ high: 75, drunk: 25, both: 0, sober: 0 })
  })
  it('thirds sum to 100', () => {
    const b = influenceBreakdown(rows('high', 'drunk', 'both'))
    expect(b.high + b.drunk + b.both + b.sober).toBe(100)
  })
  it('empty is zeros', () => {
    expect(influenceBreakdown([])).toEqual({ high: 0, drunk: 0, both: 0, sober: 0 })
  })
})
