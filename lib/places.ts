export const PLACE_CATEGORIES = [
  'restaurant', 'fast_food', 'cafe', 'bar', 'pub',
  'ice_cream', 'food_court', 'bakery', 'deli', 'confectionery',
] as const
export type PlaceCategory = (typeof PLACE_CATEGORIES)[number]

// JS mirror of the SQL name_key expression
export const nameKey = (name: string): string => name.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')

export type SpotHit = { name: string; category: PlaceCategory | null; placeId?: string }

const isCategory = (v: unknown): v is PlaceCategory => (PLACE_CATEGORIES as readonly unknown[]).includes(v)

export function mapPhoton(json: unknown): SpotHit[] {
  const features = (json as { features?: unknown } | null)?.features
  if (!Array.isArray(features)) return []
  const seen = new Set<string>()
  const out: SpotHit[] = []
  for (const f of features) {
    const p = (f as { properties?: { name?: unknown; osm_value?: unknown } } | null)?.properties
    if (!p || typeof p.name !== 'string' || !p.name.trim()) continue
    const key = nameKey(p.name)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push({ name: p.name.trim(), category: isCategory(p.osm_value) ? p.osm_value : null })
  }
  return out
}

export function mergeHits(db: SpotHit[], photon: SpotHit[], max = 8): SpotHit[] {
  const keys = new Set(db.map((h) => nameKey(h.name)))
  return [...db, ...photon.filter((h) => !keys.has(nameKey(h.name)))].slice(0, max)
}
