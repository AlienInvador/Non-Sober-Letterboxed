import { expect, test, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/tmdb', () => ({
  TmdbError: class TmdbError extends Error {},
  searchMovies: vi.fn(),
}))
const getUser = vi.fn()
vi.mock('@/lib/supabase/server', () => ({ createServerClient: async () => ({ auth: { getUser } }) }))
import { GET } from '@/app/api/tmdb/search/route'
import { TmdbError, searchMovies } from '@/lib/tmdb'

test('no user gives 401', async () => {
  getUser.mockResolvedValue({ data: { user: null } })
  const res = await GET(new Request('http://x/api/tmdb/search?q=a'))
  expect(res.status).toBe(401)
  expect(searchMovies).not.toHaveBeenCalled()
})

test('q is capped at 100 chars', async () => {
  getUser.mockResolvedValue({ data: { user: { id: 'u' } } })
  vi.mocked(searchMovies).mockResolvedValue([])
  await GET(new Request(`http://x/api/tmdb/search?q=${'a'.repeat(300)}`))
  expect(vi.mocked(searchMovies).mock.calls.at(-1)![0]).toHaveLength(100)
})

test('TmdbError gives 502 tmdb_unavailable', async () => {
  getUser.mockResolvedValue({ data: { user: { id: 'u' } } })
  vi.mocked(searchMovies).mockRejectedValue(new TmdbError('boom'))
  const res = await GET(new Request('http://x/api/tmdb/search?q=a'))
  expect(res.status).toBe(502)
  expect(await res.json()).toEqual({ error: 'tmdb_unavailable' })
})
