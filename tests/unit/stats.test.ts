import { describe, it, expect } from 'vitest'
import { formatRecommendPct } from '@/lib/stats'

describe('formatRecommendPct', () => {
  it('null -> dash', () => expect(formatRecommendPct(null)).toBe('—'))
  it('rounds', () => expect(formatRecommendPct(66.67)).toBe('67%'))
})

import { rankForDiscover } from '@/lib/stats'
const r = (tmdbId: number, logCount: number, recommendPct: number | null, influence: 'high' | 'drunk' = 'high') =>
  ({ tmdbId, influence, logCount, recommendPct }) as const
describe('rankForDiscover', () => {
  it('excludes <5 logs, null pct, other influence', () => {
    expect(rankForDiscover([r(1, 4, 100), r(2, 9, null), r(3, 9, 90, 'drunk'), r(4, 5, 50)], 'high').map((x) => x.tmdbId)).toEqual([4])
  })
  it('sorts pct desc, ties by logCount', () => {
    expect(rankForDiscover([r(1, 5, 80), r(2, 9, 80), r(3, 6, 95)], 'high').map((x) => x.tmdbId)).toEqual([3, 2, 1])
  })
})
