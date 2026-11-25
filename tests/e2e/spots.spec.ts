import { test, expect, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { ALICE, BOB } from './helpers'

const TAG_DATE = '2025-05-02'

function adminClient() {
  process.loadEnvFile('.env.local')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } })
}
async function ids() {
  const admin = adminClient()
  const { data, error } = await admin.from('profiles').select('id, username').in('username', [ALICE.username, BOB.username])
  if (error) throw new Error(error.message)
  const id = (u: string) => data!.find((p) => p.username === u)!.id
  return { admin, alice: id(ALICE.username), bob: id(BOB.username) }
}
async function cleanup() {
  const { admin, alice, bob } = await ids()
  const { error } = await admin.from('sessions').delete().in('user_id', [alice, bob]).not('place_id', 'is', null)
  if (error) throw new Error(error.message)
  await admin.from('profiles').update({ default_visibility: 'friends' }).in('id', [alice, bob])
}

test.beforeAll(cleanup)
test.afterAll(cleanup)

const HITS = [{ name: 'Taco Bell', category: 'fast_food' }, { name: 'Tacos El Gordo', category: 'restaurant' }]

async function openFood(page: Page) {
  await page.route('**/api/places/search**', (r) => r.fulfill({ json: HITS }))
  await page.goto('/')
  await page.getByRole('button', { name: /Log/ }).first().click()
  await page.getByRole('button', { name: 'Food' }).click()
}

test('log a food spot from search, then it shows in feed and profile', async ({ page }) => {
  await openFood(page)
  await page.getByLabel('Spot').fill('taco')
  await page.getByRole('button', { name: /Taco Bell/ }).click()
  await page.getByRole('button', { name: 'High' }).click()
  await page.getByRole('button', { name: 'Yes, recommend it high' }).click()
  await page.getByRole('button', { name: /Save/ }).click()
  await expect(page.getByText('Logged').first()).toBeVisible()
  await expect(page.getByRole('button', { name: /Send this rec/ })).toHaveCount(0)
  await page.goto('/')
  await expect(page.getByText('Taco Bell').first()).toBeVisible()
  await page.goto(`/u/${ALICE.username}`)
  await expect(page.getByText('Taco Bell').first()).toBeVisible()
})

test('typed-name path saves', async ({ page }) => {
  await openFood(page)
  await page.getByLabel('Spot').fill("grandma's basement")
  await page.getByRole('button', { name: /use “grandma's basement”/ }).click()
  await expect(page.getByText("grandma's basement").first()).toBeVisible()
  await page.getByRole('button', { name: 'Drunk' }).click()
  await page.getByRole('button', { name: /Yes, recommend it drunk/ }).click()
  await page.getByRole('button', { name: /Save/ }).click()
  await expect(page.getByText('Logged').first()).toBeVisible()
  await page.goto('/')
  await expect(page.getByText("grandma's basement").first()).toBeVisible()
})

test('tag on a place sesh prefills the spot', async ({ browser }) => {
  test.setTimeout(90_000)
  const { admin, alice, bob } = await ids()
  let { data: place } = await admin.from('places').select('id').eq('name_key', 'tagspot').maybeSingle()
  if (!place) {
    const r = await admin.from('places').insert({ name: 'Tag Spot', category: 'cafe' }).select('id').single()
    if (r.error) throw new Error(r.error.message)
    place = r.data
  }
  const { data: s, error } = await admin.from('sessions').insert({
    user_id: alice, place_id: place!.id, watched_on: TAG_DATE, influence: 'drunk', recommend: true, visibility: 'friends',
  }).select('id').single()
  if (error) throw new Error(error.message)
  const { error: e2 } = await admin.from('session_companions').insert({ session_id: s!.id, user_id: bob })
  if (e2) throw new Error(e2.message)

  const ctx = await browser.newContext({ storageState: BOB.state })
  const b = await ctx.newPage()
  await b.goto('/')
  await b.getByRole('button', { name: `Approve tag from ${ALICE.username} on Tag Spot` }).click()
  const dialog = b.getByRole('dialog', { name: 'Log a sesh' })
  await expect(dialog.getByText('Tag Spot')).toBeVisible()
  await dialog.getByRole('button', { name: 'Drunk' }).click()
  await dialog.getByRole('button', { name: 'Yes, recommend it drunk' }).click()
  await dialog.getByRole('button', { name: /Save/ }).click()
  await expect(b.getByText('Logged').first()).toBeVisible()
  await b.goto('/')
  await expect(b.getByText('Tag Spot').first()).toBeVisible()
  await ctx.close()
})

test('visibility defaults to the profile default', async ({ page }) => {
  const { admin, alice } = await ids()
  await admin.from('profiles').update({ default_visibility: 'public' }).eq('id', alice)
  await page.goto('/')
  await page.getByRole('button', { name: /Log/ }).first().click()
  await page.getByPlaceholder('Search a movie').fill('x') // movie mode: sheet open
  await page.route('**/api/tmdb/search*', (r) => r.fulfill({ json: [{ tmdbId: 27205, title: 'Inception', year: 2010, posterPath: null }] }))
  await page.getByPlaceholder('Search a movie').fill('incep')
  await page.getByRole('option', { name: /Inception/ }).click()
  await page.getByRole('button', { name: '+ More' }).click()
  await expect(page.getByLabel('Visibility')).toHaveValue('public')
})

test('place page: from a feed card, shows how it hits + logs; log this spot prefills; bad id 404s', async ({ page }) => {
  const { admin, alice } = await ids()
  let { data: place } = await admin.from('places').select('id').eq('name_key', 'pagespot').maybeSingle()
  if (!place) {
    const r = await admin.from('places').insert({ name: 'Page Spot', category: 'cafe' }).select('id').single()
    if (r.error) throw new Error(r.error.message)
    place = r.data
  }
  const { error } = await admin.from('sessions').insert({
    user_id: alice, place_id: place!.id, watched_on: TAG_DATE, influence: 'drunk', recommend: true, visibility: 'public', review: 'greasy and perfect',
  })
  if (error) throw new Error(error.message)

  await page.goto('/')
  await page.getByRole('link', { name: 'Page Spot' }).first().click()
  await expect(page).toHaveURL(`/place/${place!.id}`)
  await expect(page.getByRole('heading', { name: 'Page Spot', level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'How it hits' })).toBeVisible()
  await expect(page.getByText('greasy and perfect')).toBeVisible()
  await expect(page.getByText(/from public logs only/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Delete', exact: true }).first()).toBeVisible()

  await page.getByRole('button', { name: 'Log this spot' }).click()
  const dialog = page.getByRole('dialog', { name: 'Log a sesh' })
  await expect(dialog.getByText('Page Spot')).toBeVisible()
  // the Food/Movie toggle is hidden once a subject is chosen, so check no movie picker is shown
  await expect(dialog.getByPlaceholder('Search a movie')).toHaveCount(0)

  const res = await page.goto('/place/not-a-uuid')
  expect(res?.status()).toBe(404)
})

test('hero still shows a movie when recommended place seshes outnumber movie ones', async ({ page }) => {
  const { admin, alice } = await ids()
  const { error: me } = await admin.from('movies').upsert({ tmdb_id: 27205, title: 'Inception', cached_at: new Date().toISOString() }, { onConflict: 'tmdb_id', ignoreDuplicates: true })
  if (me) throw new Error(me.message)
  let { data: place } = await admin.from('places').select('id').eq('name_key', 'herospot').maybeSingle()
  if (!place) {
    const r = await admin.from('places').insert({ name: 'Hero Spot', category: 'cafe' }).select('id').single()
    if (r.error) throw new Error(r.error.message)
    place = r.data
  }
  const base = { user_id: alice, watched_on: TAG_DATE, influence: 'high', recommend: true, visibility: 'public' }
  const { data: movieSesh, error } = await admin.from('sessions').insert({ ...base, tmdb_id: 27205 }).select('id').single()
  if (error) throw new Error(error.message)
  try {
    const { error: e2 } = await admin.from('sessions').insert([{ ...base, place_id: place!.id }, { ...base, place_id: place!.id }])
    if (e2) throw new Error(e2.message)
    await page.goto('/')
    await expect(page.getByText(/pick tonight/)).toBeVisible()
  } finally {
    await admin.from('sessions').delete().eq('id', movieSesh!.id)
  }
})
