import { describe, it, expect } from 'vitest'
import { nameKey, mapPhoton, mergeHits } from '@/lib/places'
import { subjectOf } from '@/lib/subject'

describe('nameKey', () => {
  it('normalizes', () => {
    expect(nameKey('Taco Bell')).toBe('tacobell')
    expect(nameKey(' taco-bell ')).toBe('tacobell')
    expect(nameKey("McDonald's")).toBe('mcdonalds')
    expect(nameKey('Café Lulu')).toBe('cafélulu')
    expect(nameKey('🌮')).toBe('')
  })
})

describe('mapPhoton', () => {
  it('keeps named, dedupes, maps category', () => {
    const json = {
      features: [
        { properties: { name: 'Wingstop', osm_key: 'amenity', osm_value: 'fast_food' } },
        { properties: { name: 'Wingstop', osm_key: 'amenity', osm_value: 'fast_food' } },
        { properties: { osm_key: 'amenity', osm_value: 'fast_food' } },
      ],
    }
    expect(mapPhoton(json)).toEqual([{ name: 'Wingstop', category: 'fast_food' }])
  })
  it('unknown category is null; bad input is empty', () => {
    expect(mapPhoton({ features: [{ properties: { name: 'X', osm_value: 'zoo' } }] })[0].category).toBeNull()
    expect(mapPhoton(null)).toEqual([])
    expect(mapPhoton({ features: 'no' })).toEqual([])
  })
})

describe('mergeHits', () => {
  it('db first, photon deduped', () => {
    const out = mergeHits(
      [{ name: 'Taco Bell', placeId: 'x', category: null }],
      [{ name: 'taco bell', category: 'fast_food' }, { name: 'Chipotle', category: 'fast_food' }],
    )
    expect(out.map((h) => h.name)).toEqual(['Taco Bell', 'Chipotle'])
  })
})

describe('subjectOf', () => {
  it('place / null', () => {
    expect(subjectOf({ movies: null, places: { id: 'p', name: 'N', category: null } })?.kind).toBe('place')
    expect(subjectOf({ movies: null, places: null })).toBeNull()
  })
  it('movie', () => {
    const s = subjectOf({ movies: { tmdb_id: 1, title: 'T', year: 2000, poster_path: '/a' }, places: null })
    expect(s).toEqual({ kind: 'movie', movie: { tmdbId: 1, title: 'T', year: 2000, posterPath: '/a' } })
  })
})
