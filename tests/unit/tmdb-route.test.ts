import { expect, test, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/tmdb', () => ({
  TmdbError: class TmdbError extends Error {},
  searchMovies: vi.fn(),
}))
import { GET } from '@/app/api/tmdb/search/route'
import { TmdbError, searchMovies } from '@/lib/tmdb'

test('TmdbError gives 502 tmdb_unavailable', async () => {
  vi.mocked(searchMovies).mockRejectedValue(new TmdbError('boom'))
  const res = await GET(new Request('http://x/api/tmdb/search?q=a'))
  expect(res.status).toBe(502)
  expect(await res.json()).toEqual({ error: 'tmdb_unavailable' })
})
