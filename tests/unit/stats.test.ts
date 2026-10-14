import { describe, it, expect } from 'vitest'
import { formatRecommendPct } from '@/lib/stats'

describe('formatRecommendPct', () => {
  it('null -> dash', () => expect(formatRecommendPct(null)).toBe('—'))
  it('rounds', () => expect(formatRecommendPct(66.67)).toBe('67%'))
})
