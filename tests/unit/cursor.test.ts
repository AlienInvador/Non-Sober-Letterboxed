import { describe, it, expect } from 'vitest'
import { encodeCursor, decodeCursor } from '@/lib/cursor'

const c = { createdAt: '2026-10-14T12:00:00.123456+00:00', id: '11111111-2222-3333-4444-555555555555' }
describe('feed cursor', () => {
  it('accepts microseconds with offset, unchanged', () => {
    const v = { createdAt: '2026-10-14T12:00:00.123456-05:30', id: c.id }
    expect(decodeCursor(encodeCursor(v))).toEqual(v)
  })
  it('round-trips', () => expect(decodeCursor(encodeCursor(c))).toEqual(c))
  it('rejects garbage', () => {
    expect(decodeCursor('not-a-cursor')).toBeNull()
    expect(decodeCursor(Buffer.from('2026-10-14|x').toString('base64url'))).toBeNull()
    const inj = Buffer.from(`2026-10-14 (",or(visibility.neq.zzz,a.eq."))|${c.id}`).toString('base64url')
    expect(Number.isNaN(Date.parse('2026-10-14 (",or(visibility.neq.zzz,a.eq."))'))).toBe(false) // why Date.parse alone is not enough
    expect(decodeCursor(inj)).toBeNull()
    expect(decodeCursor(Buffer.from(`bad|${c.id}`).toString('base64url'))).toBeNull()
  })
})
