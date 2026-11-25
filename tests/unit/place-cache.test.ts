import { describe, it, expect, vi } from 'vitest'
vi.mock('server-only', () => ({}))
import { ensurePlaceCached } from '@/lib/place-cache'

describe('ensurePlaceCached', () => {
  it('inserts then looks up by name_key', async () => {
    const db = { insertIfNew: vi.fn(async () => {}), idByKey: vi.fn(async () => 'p1') }
    expect(await ensurePlaceCached({ name: " McDonald's ", category: null }, { db })).toBe('p1')
    expect(db.insertIfNew).toHaveBeenCalled()
    expect(db.idByKey).toHaveBeenCalledWith('mcdonalds')
  })
  it('throws when no row comes back', async () => {
    const db = { insertIfNew: async () => {}, idByKey: async () => null }
    await expect(ensurePlaceCached({ name: 'X', category: null }, { db })).rejects.toThrow()
  })
})
