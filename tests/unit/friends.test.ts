import { describe, it, expect, vi } from 'vitest'
const from = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'me' } } }) }, from }),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
import { orderedPair, escapeLike } from '@/lib/friends'
import { requestFriend } from '@/actions/friends'

describe('friends', () => {
  it('orderedPair sorts', () => {
    expect(orderedPair('b', 'a')).toEqual(['a', 'b'])
    expect(orderedPair('a', 'b')).toEqual(['a', 'b'])
  })
  it('escapeLike escapes wildcards', () => {
    expect(escapeLike('a%b_c')).toBe('a\\%b\\_c')
  })
  it('requesting yourself fails before any DB call', async () => {
    expect(await requestFriend('me')).toEqual({ ok: false, error: 'self' })
    expect(from).not.toHaveBeenCalled()
  })
})
