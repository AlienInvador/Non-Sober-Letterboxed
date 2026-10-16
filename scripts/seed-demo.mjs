// Demo data for Discover/feeds. Idempotent: wipes and re-inserts only rows owned by demo-* users.
// Usage: npm run seed:demo   (needs .env.local with Supabase URL, SUPABASE_SECRET_KEY, TMDB_API_KEY)
import { randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

try { process.loadEnvFile('.env.local') } catch {}
// The cloud project is production now; demo users must never be seeded there.
if (!/^https?:\/\/(127\.0\.0\.1|localhost)[:/]/.test(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '') && process.env.ALLOW_TEST_DATA !== '1') {
  console.error('seed:demo refuses to run against a non-local Supabase project (set ALLOW_TEST_DATA=1 to override)')
  process.exit(1)
}
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } })
const must = (r) => {
  if (r.error) throw new Error(`seed: ${r.error.message}`)
  return r.data
}

const NAMES = ['maya', 'theo', 'june', 'rafi', 'noor', 'kai']
// real TMDB ids: first 4 get 5 "high" public logs, next 3 "drunk", next 2 "both"; the rest get a scattering
const MOVIES = [27205, 603, 155, 680, 550, 120, 18785, 8363, 105, 18, 1124, 329865, 76341, 245891, 438631, 129, 78, 11, 121, 4935]
const REVIEWS = [
  'Perfect blanket movie. Zero regrets.', 'Hit different at 1am, would pull up again.', 'We paused it twice to argue about the ending.',
  'Snacks were elite, so was this.', 'Cozy, strange, exactly what the couch needed.', 'The soundtrack alone carried the night.',
  'Laughed way too hard at the wrong parts.', 'Rewatch material, easily.', 'A little much, but a good time.', 'Quiet night in, big feelings.',
]

async function tmdbMovie(id) {
  const key = process.env.TMDB_API_KEY ?? ''
  const url = new URL(`https://api.themoviedb.org/3/movie/${id}`)
  const headers = {}
  if (key.length <= 40) url.searchParams.set('api_key', key)
  else headers.Authorization = `Bearer ${key}`
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`seed: TMDB ${res.status} for movie ${id}`)
  const d = await res.json()
  return {
    tmdb_id: d.id, title: d.title, year: d.release_date ? Number(d.release_date.slice(0, 4)) || null : null,
    poster_path: d.poster_path ?? null, backdrop_path: d.backdrop_path ?? null,
    genres: (d.genres ?? []).map((g) => g.name), runtime: d.runtime || null, cached_at: new Date().toISOString(),
  }
}

// users
const password = randomBytes(18).toString('base64url') // never printed
const existing = must(await admin.auth.admin.listUsers({ perPage: 1000 })).users
const ids = []
for (const n of NAMES) {
  const email = `demo-${n}@geeked-drunk.test`
  let u = existing.find((x) => x.email === email)
  if (u) must(await admin.auth.admin.updateUserById(u.id, { password }))
  else u = must(await admin.auth.admin.createUser({ email, password, email_confirm: true })).user
  ids.push(u.id)
  must(await admin.from('profiles').upsert({ id: u.id, username: `demo_${n}`, display_name: n[0].toUpperCase() + n.slice(1), birthdate: '1990-01-01' }))
}

// wipe prior demo rows (sessions cascade cheers/companions; crews cascade members and crew lists)
must(await admin.from('sessions').delete().in('user_id', ids))
must(await admin.from('crews').delete().in('created_by', ids))
must(await admin.from('lists').delete().in('owner_id', ids))
must(await admin.from('queue').delete().in('user_id', ids))
// both sides must be demo ids: never touch a demo<->real friendship
must(await admin.from('friendships').delete().in('user_a', ids).in('user_b', ids))

// movies
const movies = []
for (const id of MOVIES) movies.push(await tmdbMovie(id))
must(await admin.from('movies').upsert(movies))

// friendships: everyone with everyone
const friendships = []
for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
  const [a, b] = [ids[i], ids[j]].sort()
  friendships.push({ user_a: a, user_b: b, status: 'accepted', requested_by: ids[i] })
}
must(await admin.from('friendships').insert(friendships))

// crews
const crews = must(await admin.from('crews').insert([
  { name: 'Demo Couch Club', created_by: ids[0] },
  { name: 'Demo Late Night', created_by: ids[3] },
]).select('id'))
const members = [[0, 0, 1, 2], [1, 3, 4, 5, 0]]
must(await admin.from('crew_members').insert(members.flatMap(([c, ...us]) =>
  us.map((u, i) => ({ crew_id: crews[c].id, user_id: ids[u], role: i === 0 ? 'owner' : 'member' })))))

// sessions: [movieIdx, influence, count]
const plan = []
MOVIES.forEach((_, m) => {
  if (m < 4) plan.push([m, 'high', 5])
  else if (m < 7) plan.push([m, 'drunk', 5])
  else if (m < 9) plan.push([m, 'both', 5])
  else plan.push([m, ['sober', 'high', 'drunk', 'both'][m % 4], 1 + (m % 2)])
})
const rows = []
let n = 0
for (const [m, influence, count] of plan) {
  for (let k = 0; k < count; k++, n++) {
    const u = (m + k) % ids.length
    const hot = m < 9 // hot movies stay fully public so Discover ranks them
    const crewIdx = !hot && n % 3 === 0 ? (u < 3 ? 0 : 1) : null
    const crewOk = crewIdx !== null && members[crewIdx].slice(1).includes(u)
    // ~75% recommend, a movie-dependent few don't; sober never has a verdict
    const recommend = influence === 'sober' ? null : (m + k) % (3 + (m % 3)) !== 0
    rows.push({
      user_id: ids[u], tmdb_id: MOVIES[m], influence, recommend,
      review: n % 3 === 0 ? REVIEWS[n % REVIEWS.length] : null,
      visibility: crewOk ? 'crew' : !hot && n % 5 === 1 ? 'friends' : 'public',
      crew_id: crewOk ? crews[crewIdx].id : null,
      watched_on: new Date(Date.now() - (n % 14) * 864e5).toISOString().slice(0, 10),
      created_at: new Date(Date.now() - n * 3.1 * 36e5).toISOString(),
    })
  }
}
const sessions = must(await admin.from('sessions').insert(rows).select('id, visibility'))

// cheers on a few friends/crew sessions (invisible to strangers, so supabase/tests' global stranger counts stay 0)
const pub = sessions.filter((s) => s.visibility !== 'public').slice(0, 8)
const owner = new Map(must(await admin.from('sessions').select('id, user_id').in('id', pub.map((s) => s.id))).map((s) => [s.id, s.user_id]))
const cheers = pub.flatMap((s, i) => [1, 2].map((d) => ({ session_id: s.id, user_id: ids[(ids.indexOf(owner.get(s.id)) + d + i % 2) % ids.length] })))
must(await admin.from('cheers').upsert(cheers))

// lists
const lists = must(await admin.from('lists').insert([
  { owner_id: ids[0], title: 'Demo: blanket fort picks', description: 'Soft landings only.', visibility: 'friends' },
  { owner_id: ids[1], title: 'Demo: loud and fun', description: 'For when the room is full.', visibility: 'friends' },
]).select('id'))
must(await admin.from('list_items').insert([
  ...[27205, 129, 438631, 329865].map((t, i) => ({ list_id: lists[0].id, tmdb_id: t, position: i, added_by: ids[0] })),
  ...[18785, 8363, 76341, 245891].map((t, i) => ({ list_id: lists[1].id, tmdb_id: t, position: i, added_by: ids[1] })),
]))

console.log(`seeded: ${ids.length} users, ${movies.length} movies, ${friendships.length} friendships, ${crews.length} crews, ${sessions.length} sessions, ${cheers.length} cheers, ${lists.length} lists`)
console.log(movies.map((m) => `${m.tmdb_id}:${m.title}`).join(', '))
