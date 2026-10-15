import { describe, it, expect, vi } from 'vitest'
import { stateWord } from '@/lib/influence'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/movies', () => ({ ensureMovieCached: async () => ({}) }))

let failTable = ''
const orSpy = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'me' } } }) },
    from: (t: string) => {
      const data = t === 'friendships' ? [{ user_a: 'me', user_b: 'f1' }] : []
      const res = { data: t === failTable ? null : data, error: t === failTable ? { message: `${t} failed` } : null }
      const q: Record<string, unknown> = {
        select: () => q, eq: () => q, neq: () => q, order: () => q, limit: () => q, in: () => q,
        or: (f: string) => { orSpy(f); return q },
        then: (ok: (v: unknown) => unknown) => ok(res),
      }
      return q
    },
  }),
}))

import { friendVerdicts, getFriendVerdicts } from '@/lib/queries/movie'

describe('friendVerdicts', () => {
  it('counts distinct friends per state using each friend\'s latest sesh, skipping sober', () => {
    const rows = [ // newest first
      { user_id: 'a', influence: 'high' as const, recommend: true },
      { user_id: 'a', influence: 'high' as const, recommend: false }, // older, ignored
      { user_id: 'b', influence: 'high' as const, recommend: false },
      { user_id: 'c', influence: 'high' as const, recommend: true },
      { user_id: 'a', influence: 'drunk' as const, recommend: true },
      { user_id: 'b', influence: 'sober' as const, recommend: null },
    ]
    expect(friendVerdicts(rows)).toEqual([
      { influence: 'drunk', recommendCount: 1, total: 1 },
      { influence: 'high', recommendCount: 2, total: 3 },
    ])
  })
  it('is empty with no friend logs', () => {
    expect(friendVerdicts([])).toEqual([])
  })
})

describe('getFriendVerdicts', () => {
  it.each(['friendships', 'sessions'])('throws when %s query fails', async (t) => {
    failTable = t
    await expect(getFriendVerdicts(1)).rejects.toThrow(`${t} failed`)
  })
  it('scopes friendships to the caller', async () => {
    failTable = ''
    await expect(getFriendVerdicts(1)).resolves.toEqual([])
    expect(orSpy).toHaveBeenCalledWith('user_a.eq.me,user_b.eq.me')
  })
})

describe('stateWord', () => {
  it('spells out both', () => {
    expect(stateWord('high')).toBe('high')
    expect(stateWord('both')).toBe('drunk and high')
  })
})
