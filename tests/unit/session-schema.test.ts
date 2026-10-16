import { describe, it, expect } from 'vitest'
import { sessionInput } from '@/lib/session-schema'

const CREW = '3f1c1b9e-6b1a-4c1e-9d2a-0a7c5e2f8b11'
const valid = { tmdbId: 603, influence: 'drunk', recommend: true, watchedOn: '2026-10-14' }

describe('sessionInput', () => {
  it('applies defaults', () => {
    const r = sessionInput.parse(valid)
    expect(r).toMatchObject({ visibility: 'friends', companionIds: [], rewatch: false, review: null, crewId: null })
  })
  it('recommend required unless sober', () => {
    for (const influence of ['drunk', 'high', 'both']) {
      expect(sessionInput.safeParse({ ...valid, influence, recommend: null }).success).toBe(false)
      expect(sessionInput.safeParse({ ...valid, influence, recommend: undefined }).success).toBe(false)
      expect(sessionInput.safeParse({ ...valid, influence, recommend: false }).success).toBe(true)
    }
    expect(sessionInput.safeParse({ ...valid, influence: 'sober', recommend: true }).success).toBe(false)
    expect(sessionInput.safeParse({ ...valid, influence: 'sober', recommend: null }).success).toBe(true)
    expect(sessionInput.safeParse({ ...valid, influence: 'sober', recommend: undefined }).success).toBe(true)
  })
  it('has no rating key', () => {
    expect('rating' in sessionInput.parse(valid)).toBe(false)
  })
  it('crewId iff crew', () => {
    expect(sessionInput.safeParse({ ...valid, visibility: 'crew', crewId: null }).success).toBe(false)
    expect(sessionInput.safeParse({ ...valid, visibility: 'crew', crewId: CREW }).success).toBe(true)
    expect(sessionInput.safeParse({ ...valid, visibility: 'public', crewId: CREW }).success).toBe(false)
  })
  it('rejects non-uuid ids, overlong review, too many companions', () => {
    expect(sessionInput.safeParse({ ...valid, visibility: 'crew', crewId: 'c1' }).success).toBe(false)
    expect(sessionInput.safeParse({ ...valid, companionIds: ['x'] }).success).toBe(false)
    expect(sessionInput.safeParse({ ...valid, review: 'a'.repeat(2001) }).success).toBe(false)
    expect(sessionInput.safeParse({ ...valid, companionIds: Array(21).fill(CREW) }).success).toBe(false)
  })
})
