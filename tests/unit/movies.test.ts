import { describe, it, expect, vi } from 'vitest'
vi.mock('server-only', () => ({}))
import { ensureMovieCached, type MovieDb } from '@/lib/movies'
import type { Movie } from '@/lib/tmdb'

const movie: Movie = { tmdbId: 1, title: 'A', year: 2000, posterPath: null, backdropPath: null, genres: [], runtime: 90 }
const NOW = Date.parse('2026-10-14T12:00:00Z')
const setup = (cachedAt: string | null) => {
  const db: MovieDb = {
    get: vi.fn(async () => (cachedAt ? { movie, cachedAt } : null)),
    upsert: vi.fn(async () => {}),
  }
  const fetcher = vi.fn(async () => ({ ...movie, title: 'fresh' }))
  return { db, fetcher, now: () => NOW }
}

describe('ensureMovieCached', () => {
  it('fresh row: no fetch', async () => {
    const d = setup('2026-10-14T00:00:00Z')
    expect((await ensureMovieCached(1, d)).title).toBe('A')
    expect(d.fetcher).not.toHaveBeenCalled()
  })
  it('stale row: refetch + upsert', async () => {
    const d = setup('2026-10-13T11:00:00Z')
    expect((await ensureMovieCached(1, d)).title).toBe('fresh')
    expect(d.db.upsert).toHaveBeenCalledOnce()
  })
  it('missing row: fetch + upsert', async () => {
    const d = setup(null)
    await ensureMovieCached(1, d)
    expect(d.fetcher).toHaveBeenCalledWith(1)
    expect(d.db.upsert).toHaveBeenCalledOnce()
  })
})
