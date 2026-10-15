import { mkdirSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { ALICE, BOB, CAROL, SEED_REVIEW, INCEPTION, TEST_PASSWORD } from './helpers'

type Cookie = { name: string; value: string; domain: string; path: string; httpOnly: boolean; secure: boolean; sameSite: 'Lax'; expires: number }

export default async function globalSetup() {
  process.loadEnvFile('.env.local')
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const pub = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  const admin = createClient(url, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } })
  const must = <R extends { data: unknown; error: { message: string } | null }>(r: R) => {
    if (r.error) throw new Error(`e2e setup: ${r.error.message}`)
    return r.data as NonNullable<R['data']>
  }

  const ids: Record<string, string> = {}
  for (const u of [ALICE, BOB, CAROL]) {
    const created = await admin.auth.admin.createUser({ email: u.email, password: TEST_PASSWORD, email_confirm: true })
    if (created.data.user) ids[u.email] = created.data.user.id
    else {
      const list = must(await admin.auth.admin.listUsers({ perPage: 1000 }))
      ids[u.email] = list.users.find((x) => x.email === u.email)!.id
    }
    must(await admin.from('profiles').upsert({ id: ids[u.email], username: u.username, display_name: u.username, birthdate: '1990-01-01' }))
  }

  const [a, b] = [ids[ALICE.email], ids[BOB.email]].sort()
  must(await admin.from('friendships').upsert({ user_a: a, user_b: b, status: 'accepted', requested_by: ids[ALICE.email] }))
  must(await admin.from('movies').upsert({
    tmdb_id: INCEPTION.tmdbId, title: INCEPTION.title, year: INCEPTION.year, poster_path: INCEPTION.posterPath,
    backdrop_path: null, genres: ['Action'], runtime: 148, cached_at: new Date().toISOString(),
  }))
  must(await admin.from('crews').delete().eq('name', 'Couch Crew'))
  // alice's friends-only sesh for bob to see; recreated so cheers start at 0
  must(await admin.from('sessions').delete().eq('user_id', ids[ALICE.email]).eq('review', SEED_REVIEW))
  must(await admin.from('sessions').insert({
    user_id: ids[ALICE.email], tmdb_id: INCEPTION.tmdbId, influence: 'both', rating: 4.5, recommend: true,
    review: SEED_REVIEW, visibility: 'friends',
  }))

  mkdirSync('tests/e2e/.auth', { recursive: true })
  for (const u of [ALICE, BOB, CAROL]) {
    const jar = new Map<string, string>()
    const client = createServerClient(url, pub, {
      cookies: {
        getAll: () => [...jar].map(([name, value]) => ({ name, value })),
        setAll: (list) => list.forEach(({ name, value }) => jar.set(name, value)),
      },
    })
    must(await client.auth.signInWithPassword({ email: u.email, password: TEST_PASSWORD }))
    const base = { domain: 'localhost', path: '/', httpOnly: false, secure: false, sameSite: 'Lax' as const, expires: -1 }
    const cookies: Cookie[] = [...jar].map(([name, value]) => ({ ...base, name, value }))
    cookies.push({ ...base, name: 'age_ok', value: '1', httpOnly: true })
    writeFileSync(u.state, JSON.stringify({ cookies, origins: [] }))
  }
}
