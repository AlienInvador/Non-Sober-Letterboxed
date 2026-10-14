import { describe, it, expect } from 'vitest'
import { influenceFromChips, recommendLabel, influenceLabel } from '@/lib/influence'

describe('influence', () => {
  it('chips', () => {
    expect(influenceFromChips({ drunk: true, high: true, sober: false })).toBe('both')
    expect(influenceFromChips({ drunk: true, high: false, sober: false })).toBe('drunk')
    expect(influenceFromChips({ drunk: false, high: true, sober: false })).toBe('high')
    expect(influenceFromChips({ drunk: false, high: false, sober: true })).toBe('sober')
    expect(influenceFromChips({ drunk: false, high: false, sober: false })).toBeNull()
  })
  it('labels', () => {
    expect(recommendLabel('drunk')).toBe('Recommend it drunk?')
    expect(recommendLabel('high')).toBe('Recommend it high?')
    expect(recommendLabel('both')).toBe('Recommend it drunk and high?')
    expect(recommendLabel('sober')).toBeNull()
    expect(influenceLabel('both')).toBe('Both')
    expect(influenceLabel('sober')).toBe('Sober')
  })
})
