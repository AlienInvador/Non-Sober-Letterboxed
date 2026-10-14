import { describe, it, expect } from 'vitest'
import { sessionInput } from '@/lib/session-schema'

const valid = { tmdbId: 603, influence: 'drunk', watchedOn: '2026-10-14' }

describe('sessionInput', () => {
  it('applies defaults', () => {
    const r = sessionInput.parse(valid)
    expect(r).toMatchObject({ visibility: 'friends', companionIds: [], rewatch: false, rating: null, recommend: null, review: null, crewId: null })
  })
  it('rating', () => {
    expect(sessionInput.safeParse({ ...valid, rating: 3.3 }).success).toBe(false)
    expect(sessionInput.safeParse({ ...valid, rating: 0 }).success).toBe(false)
    expect(sessionInput.safeParse({ ...valid, rating: 5.5 }).success).toBe(false)
    expect(sessionInput.safeParse({ ...valid, rating: 0.5 }).success).toBe(true)
    expect(sessionInput.safeParse({ ...valid, rating: 5 }).success).toBe(true)
  })
  it('sober cannot recommend', () => {
    expect(sessionInput.safeParse({ ...valid, influence: 'sober', recommend: true }).success).toBe(false)
    expect(sessionInput.safeParse({ ...valid, influence: 'sober' }).success).toBe(true)
  })
  it('crewId iff crew', () => {
    expect(sessionInput.safeParse({ ...valid, visibility: 'crew', crewId: null }).success).toBe(false)
    expect(sessionInput.safeParse({ ...valid, visibility: 'crew', crewId: 'c1' }).success).toBe(true)
    expect(sessionInput.safeParse({ ...valid, visibility: 'public', crewId: 'c1' }).success).toBe(false)
  })
})
