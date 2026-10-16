import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { ALICE, BOB, INCEPTION } from './helpers'

const APPROVE_DATE = '2025-03-02'
const DECLINE_DATE = '2025-03-01'

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
  // deleting alice's seshes cascades the tag rows
  const { error } = await admin.from('sessions').delete().in('user_id', [alice, bob]).in('watched_on', [APPROVE_DATE, DECLINE_DATE])
  if (error) throw new Error(error.message)
}

test.beforeAll(cleanup)
test.afterAll(cleanup)

test('bob approves a tag as his own sesh and declines another', async ({ page, browser }) => {
  test.setTimeout(90_000)
  const { admin, alice, bob } = await ids()
  for (const d of [DECLINE_DATE, APPROVE_DATE]) {
    const { data, error } = await admin.from('sessions').insert({
      user_id: alice, tmdb_id: INCEPTION.tmdbId, watched_on: d, influence: 'drunk', recommend: true, visibility: 'friends',
    }).select('id').single()
    if (error) throw new Error(error.message)
    const { error: e2 } = await admin.from('session_companions').insert({ session_id: data!.id, user_id: bob })
    if (e2) throw new Error(e2.message)
  }

  const bobCtx = await browser.newContext({ storageState: BOB.state })
  const b = await bobCtx.newPage()
  await b.goto('/')
  await expect(b.getByRole('heading', { name: 'Tagged with you' })).toBeVisible()
  const row = (d: string) => b.getByRole('listitem').filter({ hasText: `${ALICE.username} tagged you on ${INCEPTION.title} · ${d}` })

  await row(APPROVE_DATE).getByRole('button', { name: `Approve tag from ${ALICE.username} on ${INCEPTION.title}` }).click()
  const dialog = b.getByRole('dialog', { name: 'Log a sesh' })
  await dialog.getByRole('button', { name: 'Drunk' }).click()
  await dialog.getByRole('button', { name: 'Yes, recommend it drunk' }).click()
  await dialog.getByRole('button', { name: /Save/ }).click()
  await expect(b.getByText('Logged').first()).toBeVisible()

  await b.goto(`/u/${BOB.username}`)
  await expect(b.getByRole('heading', { name: INCEPTION.title }).first()).toBeVisible()
  const { data: own } = await admin.from('sessions').select('id').eq('user_id', bob).eq('watched_on', APPROVE_DATE)
  expect(own).toHaveLength(1)

  await b.goto('/')
  await expect(row(APPROVE_DATE)).toBeHidden()
  await row(DECLINE_DATE).getByRole('button', { name: `Decline tag from ${ALICE.username} on ${INCEPTION.title}` }).click()
  await expect(row(DECLINE_DATE)).toBeHidden()
  await b.reload()
  await expect(b.getByRole('heading', { name: 'Tagged with you' })).toBeHidden()
  await bobCtx.close()

  await page.goto('/')
  await expect(page.getByText(`with ${BOB.username}`)).toHaveCount(1) // the declined tag shows nothing
})
