import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { mapPhoton, mergeHits, type SpotHit, type PlaceCategory } from '@/lib/places'

const TAGS = [
  ...['restaurant', 'fast_food', 'cafe', 'bar', 'pub', 'ice_cream', 'food_court'].map((t) => `amenity:${t}`),
  ...['bakery', 'deli', 'confectionery'].map((t) => `shop:${t}`),
]

export async function GET(req: Request) {
  // shortcut: no cache or rate limit on Photon calls; add caching/throttle if beta traffic grows past fair use
  // middleware lets /api/places through so clients get JSON, not a login redirect; auth is enforced here
  const supabase = await createServerClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const q = (new URL(req.url).searchParams.get('q') ?? '').trim().slice(0, 80)
  if (!q) return NextResponse.json([])

  const url = new URL('https://photon.komoot.io/api/')
  url.searchParams.set('q', q)
  url.searchParams.set('limit', '15')
  url.searchParams.set('lang', 'en')
  for (const t of TAGS) url.searchParams.append('osm_tag', t)

  const [db, photon] = await Promise.all([
    // an RPC error degrades to no db hits rather than a 500
    supabase.rpc('search_places', { q }).then(({ data: rows }): SpotHit[] =>
      (rows ?? []).map((r: { id: string; name: string; category: PlaceCategory | null }) => ({
        name: r.name, category: r.category, placeId: r.id,
      })),
    ),
    fetch(url, { signal: AbortSignal.timeout(3000), headers: { 'User-Agent': 'geeked-drunk/0.1' } })
      .then((r) => (r.ok ? r.json() : null))
      .then(mapPhoton)
      .catch((): SpotHit[] => []),
  ])
  return NextResponse.json(mergeHits(db, photon))
}
