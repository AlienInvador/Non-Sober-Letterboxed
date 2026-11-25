import { beforeEach, expect, test, vi } from 'vitest'

vi.mock('server-only', () => ({}))
const getUser = vi.fn()
const rpc = vi.fn()
vi.mock('@/lib/supabase/server', () => ({ createServerClient: async () => ({ auth: { getUser }, rpc }) }))
import { GET } from '@/app/api/places/search/route'

const fetchMock = vi.fn()
const req = (q: string) => new Request(`http://x/api/places/search?q=${encodeURIComponent(q)}`)
const signedIn = () => getUser.mockResolvedValue({ data: { user: { id: 'u' } } })

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', fetchMock)
  rpc.mockResolvedValue({ data: [], error: null })
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ features: [] }) })
})

test('401 when signed out', async () => {
  getUser.mockResolvedValue({ data: { user: null } })
  const res = await GET(req('a'))
  expect(res.status).toBe(401)
  expect(await res.json()).toEqual({ error: 'unauthorized' })
  expect(rpc).not.toHaveBeenCalled()
})

test('empty q returns [] and does not fetch', async () => {
  signedIn()
  const res = await GET(req('   '))
  expect(await res.json()).toEqual([])
  expect(fetchMock).not.toHaveBeenCalled()
  expect(rpc).not.toHaveBeenCalled()
})

test('db hits come first', async () => {
  signedIn()
  rpc.mockResolvedValue({ data: [{ id: 'p1', name: 'Mine', name_key: 'mine', category: 'cafe' }], error: null })
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ features: [{ properties: { name: 'Other', osm_key: 'amenity', osm_value: 'cafe' } }] }),
  })
  const body = await (await GET(req('m'))).json()
  expect(body[0]).toEqual({ name: 'Mine', category: 'cafe', placeId: 'p1' })
  expect(body.map((h: { name: string }) => h.name)).toContain('Other')
})

test('search degrades to db hits', async () => {
  signedIn()
  rpc.mockResolvedValue({ data: [{ id: 'p1', name: 'Mine', name_key: 'mine', category: null }], error: null })
  fetchMock.mockRejectedValue(new Error('timeout'))
  const res = await GET(req('m'))
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual([{ name: 'Mine', category: null, placeId: 'p1' }])
})

test('builds the Photon URL with the osm_tag filters and no lat/lon', async () => {
  signedIn()
  await GET(req('  pizza hut  '))
  const url = new URL(fetchMock.mock.calls[0][0])
  expect(url.origin + url.pathname).toBe('https://photon.komoot.io/api/')
  expect(url.searchParams.get('q')).toBe('pizza hut')
  expect(url.searchParams.get('limit')).toBe('15')
  expect(url.searchParams.has('lat')).toBe(false)
  expect(url.searchParams.has('lon')).toBe(false)
  expect(url.searchParams.getAll('osm_tag')).toEqual([
    'amenity:restaurant', 'amenity:fast_food', 'amenity:cafe', 'amenity:bar', 'amenity:pub',
    'amenity:ice_cream', 'amenity:food_court', 'shop:bakery', 'shop:deli', 'shop:confectionery',
  ])
  expect(fetchMock.mock.calls[0][1].headers['User-Agent']).toBe('geeked-drunk/0.1')
})

test('q is capped at 80 chars; rpc error degrades to photon only', async () => {
  signedIn()
  rpc.mockResolvedValue({ data: null, error: { message: 'x' } })
  const res = await GET(req('a'.repeat(300)))
  expect(res.status).toBe(200)
  expect(rpc.mock.calls[0][1]).toEqual({ q: 'a'.repeat(80) })
})
