import { afterEach, beforeEach, expect, test, vi } from 'vitest'

vi.mock('server-only', () => ({}))
import { searchMovies, getMovie, posterUrl, TmdbError } from '@/lib/tmdb'

const ok = (body: unknown) => new Response(JSON.stringify(body))
const oldKey = process.env.TMDB_API_KEY
beforeEach(() => { process.env.TMDB_API_KEY = 'k'.repeat(32) })
afterEach(() => { process.env.TMDB_API_KEY = oldKey })

test('blank query returns [] without fetching', async () => {
  const f = vi.fn()
  expect(await searchMovies('   ', f)).toEqual([])
  expect(f).not.toHaveBeenCalled()
})
test('maps TMDB results', async () => {
  const f = vi.fn().mockResolvedValue(ok({ results: [{ id: 27205, title: 'Inception', release_date: '2010-07-15', poster_path: '/p.jpg' }] }))
  expect(await searchMovies('incep', f)).toEqual([{ tmdbId: 27205, title: 'Inception', year: 2010, posterPath: '/p.jpg' }])
})
test('missing release date gives null year', async () => {
  const f = vi.fn().mockResolvedValue(ok({ results: [{ id: 1, title: 'X', release_date: '', poster_path: null }] }))
  expect((await searchMovies('x', f))[0].year).toBeNull()
})
test('non-200 throws TmdbError', async () => {
  const f = vi.fn().mockResolvedValue(new Response('no', { status: 500 }))
  await expect(searchMovies('x', f)).rejects.toBeInstanceOf(TmdbError)
})
test('v3 key goes in api_key param, no auth header', async () => {
  const f = vi.fn().mockResolvedValue(ok({ results: [] }))
  await searchMovies('x', f)
  const [url, init] = f.mock.calls[0]
  expect(String(url)).toContain('api_key=' + 'k'.repeat(32))
  expect(init?.headers?.Authorization).toBeUndefined()
})
test('long key sent as Bearer, no api_key param', async () => {
  const key = 'j'.repeat(60)
  process.env.TMDB_API_KEY = key
  const f = vi.fn().mockResolvedValue(ok({ results: [] }))
  await searchMovies('x', f)
  const [url, init] = f.mock.calls[0]
  expect(String(url)).not.toContain('api_key')
  expect(init.headers.Authorization).toBe(`Bearer ${key}`)
})
test('getMovie maps details', async () => {
  const f = vi.fn().mockResolvedValue(ok({ id: 5, title: 'T', release_date: '1999-01-02', poster_path: '/a', backdrop_path: '/b', genres: [{ id: 1, name: 'Drama' }], runtime: 0 }))
  expect(await getMovie(5, f)).toEqual({ tmdbId: 5, title: 'T', year: 1999, posterPath: '/a', backdropPath: '/b', genres: ['Drama'], runtime: null })
})
test('posterUrl', () => {
  expect(posterUrl('/p.jpg', 'w185')).toBe('https://image.tmdb.org/t/p/w185/p.jpg')
  expect(posterUrl(null, 'w185')).toBeNull()
})
