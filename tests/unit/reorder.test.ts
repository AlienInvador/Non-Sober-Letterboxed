import { describe, expect, it } from 'vitest'
import { moveItem } from '@/lib/reorder'

describe('moveItem', () => {
  it('moves forward', () => expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']))
  it('moves backward', () => expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']))
  it('clamps out-of-range to', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 99)).toEqual(['b', 'c', 'a'])
    expect(moveItem(['a', 'b', 'c'], 2, -5)).toEqual(['c', 'a', 'b'])
  })
  it('ignores bad from and does not mutate', () => {
    const a = ['a', 'b']
    expect(moveItem(a, 5, 0)).toEqual(['a', 'b'])
    moveItem(a, 0, 1)
    expect(a).toEqual(['a', 'b'])
  })
})
