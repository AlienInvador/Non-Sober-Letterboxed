import { test, expect } from 'vitest'
import { tokens } from '@/design/tokens'
test('influence colors match spec', () => {
  expect(tokens.color.bg).toBe('#2A2522')
  expect(tokens.color.drunk).toBe('#FF2E88')
  expect(tokens.color.high).toBe('#B6FF3B')
  expect(tokens.color.sober).toBe('#8A94A6')
  expect(tokens.color.accentFill).toBe('#7444EC')
  expect(tokens.font.display).toBe('Fraunces')
})
