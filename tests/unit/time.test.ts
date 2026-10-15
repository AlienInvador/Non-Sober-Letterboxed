import { describe, it, expect } from 'vitest'
import { relativeTime } from '@/lib/time'

const now = Date.parse('2026-10-14T12:00:00Z')
const ago = (s: number) => new Date(now - s * 1000).toISOString()
describe('relativeTime', () => {
  it('just now', () => expect(relativeTime(ago(20), now)).toBe('just now'))
  it('minutes', () => expect(relativeTime(ago(5 * 60), now)).toBe('5m ago'))
  it('hours', () => expect(relativeTime(ago(3 * 3600 + 10), now)).toBe('3h ago'))
  it('days', () => expect(relativeTime(ago(2 * 86400), now)).toBe('2d ago'))
  it('weeks', () => expect(relativeTime(ago(15 * 86400), now)).toBe('2w ago'))
  it('future clamps', () => expect(relativeTime(ago(-500), now)).toBe('just now'))
})
