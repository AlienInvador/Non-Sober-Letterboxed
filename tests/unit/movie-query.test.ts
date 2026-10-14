import { describe, it, expect, vi } from 'vitest'
import { normalizeInfluenceFilter } from '@/lib/influence'

vi.mock('server-only', () => ({}))
const movie = { tmdbId: 1, title: 'x', year: 2000, posterPath: null, backdropPath: null, genres: [], runtime: null }
vi.mock('@/lib/movies', () => ({ ensureMovieCached: async () => movie }))

let failTable = ''
const orSpy = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'me' } } }) },
    from: (t: string) => {
      const res = { data: t === failTable ? null : [], error: t === failTable ? { message: `${t} failed` } : null }
      const q: Record<string, unknown> = {
        select: () => q, eq: () => q, order: () => q, limit: () => q, in: () => q,
        or: (f: string) => { orSpy(f); return q },
        then: (ok: (v: unknown) => unknown) => ok(res),
      }
      return q
    },
  }),
}))

import { getMoviePage } from '@/lib/queries/movie'

describe('getMoviePage', () => {
  it.each(['movie_influence_stats', 'sessions', 'friendships'])('throws when %s query fails', async (t) => {
    failTable = t
    await expect(getMoviePage(1)).rejects.toThrow(`${t} failed`)
  })
  it('scopes friendships to the caller', async () => {
    failTable = ''
    await getMoviePage(1)
    expect(orSpy).toHaveBeenCalledWith('user_a.eq.me,user_b.eq.me')
  })
})

describe('normalizeInfluenceFilter', () => {
  it('keeps known, defaults unknown', () => {
    expect(normalizeInfluenceFilter('high')).toBe('high')
    expect(normalizeInfluenceFilter('bogus')).toBe('all')
    expect(normalizeInfluenceFilter(undefined)).toBe('all')
  })
})
