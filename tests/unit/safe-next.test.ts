import { describe, expect, it } from 'vitest'
import { safeNext } from '@/lib/safe-next'

describe('safeNext', () => {
  it('accepts same-origin paths with query', () => {
    expect(safeNext('/u/alice?add=1')).toBe('/u/alice?add=1')
    expect(safeNext('/')).toBe('/')
  })
  it('rejects open-redirect shapes and junk', () => {
    for (const bad of ['//evil.com', '/' + String.fromCharCode(92) + 'evil.com', 'https://evil.com', 'evil.com', 'javascript:alert(1)', '', '/a\nb', '/a\b']) {
      expect(safeNext(bad)).toBeNull()
    }
    expect(safeNext(null)).toBeNull()
    expect(safeNext(undefined)).toBeNull()
    expect(safeNext('/' + 'a'.repeat(2001))).toBeNull()
  })
})
