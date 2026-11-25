import { describe, it, expect } from 'vitest'
import { rankTrending } from '@/lib/trending'

const r = (user_id: string, tmdb_id: number | null, place_id: string | null, created_at: string) => ({ user_id, tmdb_id, place_id, created_at })
const SINCE = '2026-01-10T00:00:00Z'

describe('rankTrending', () => {
  it('interleaves movies and places by friend count', () => {
    const out = rankTrending([
      r('a', 1, null, '2026-01-11T00:00:00Z'),
      r('a', null, 'p1', '2026-01-11T00:00:00Z'), r('b', null, 'p1', '2026-01-12T00:00:00Z'), r('c', null, 'p1', '2026-01-12T00:00:00Z'),
      r('b', 2, null, '2026-01-12T00:00:00Z'), r('c', 2, null, '2026-01-12T00:00:00Z'),
    ], SINCE)
    expect(out).toEqual([
      { kind: 'place', id: 'p1', friendCount: 3 },
      { kind: 'movie', id: '2', friendCount: 2 },
      { kind: 'movie', id: '1', friendCount: 1 },
    ])
  })
  it('counts the same friend once', () => {
    const out = rankTrending([r('a', 1, null, '2026-01-11T00:00:00Z'), r('a', 1, null, '2026-01-12T00:00:00Z')], SINCE)
    expect(out[0].friendCount).toBe(1)
  })
  it('ignores rows before since', () => {
    expect(rankTrending([r('a', 1, null, '2026-01-09T00:00:00Z')], SINCE)).toEqual([])
  })
  it('breaks ties by newest row', () => {
    const out = rankTrending([r('a', 1, null, '2026-01-11T00:00:00Z'), r('b', null, 'p', '2026-01-13T00:00:00Z')], SINCE)
    expect(out.map((o) => o.id)).toEqual(['p', '1'])
  })
  it('respects limit', () => {
    const rows = [1, 2, 3].map((i) => r('a', i, null, '2026-01-11T00:00:00Z'))
    expect(rankTrending(rows, SINCE, 2)).toHaveLength(2)
  })
})
