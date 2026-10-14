import { describe, it, expect } from 'vitest'
import { isAtLeast21 } from '@/lib/age'

describe('isAtLeast21', () => {
  it('handles exact birthday', () => {
    expect(isAtLeast21('2005-10-14', new Date('2026-10-14'))).toBe(true)
    expect(isAtLeast21('2005-10-15', new Date('2026-10-14'))).toBe(false)
  })
  it('maps Feb 29 + 21y to Feb 28 (Postgres)', () => {
    expect(isAtLeast21('2004-02-29', new Date('2025-02-27'))).toBe(false)
    expect(isAtLeast21('2004-02-29', new Date('2025-02-28'))).toBe(true)
  })
})
