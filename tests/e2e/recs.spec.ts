import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { ALICE, BOB, INCEPTION } from './helpers'

const NOTE = 'pause before the snow level'

async function cleanup() {
  process.loadEnvFile('.env.local')
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } })
  const { data: p } = await admin.from('profiles').select('id').eq('username', ALICE.username).single()
  const { error } = await admin.from('recommendations').delete().eq('from_user', p!.id).eq('tmdb_id', INCEPTION.tmdbId)
  if (error) throw new Error(error.message)
}

test.beforeAll(cleanup)
test.afterAll(cleanup)

test('alice sends bob a rec; bob sees it on Tonight and dismisses it', async ({ page, browser }) => {
  test.setTimeout(60_000) // two users, two page loads each
  await page.goto(`/movie/${INCEPTION.tmdbId}`)
  await page.getByRole('button', { name: 'Send a rec' }).click()
  const dialog = page.getByRole('dialog', { name: 'Send a rec' })
  await dialog.getByRole('checkbox', { name: BOB.username }).check()
  await dialog.getByRole('button', { name: 'High' }).click()
  await dialog.getByLabel('Note (optional)').fill(NOTE)
  await dialog.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(dialog.getByText('Sent.')).toBeVisible()

  const bobCtx = await browser.newContext({ storageState: BOB.state })
  const bob = await bobCtx.newPage()
  await bob.goto('/')
  await expect(bob.getByRole('heading', { name: 'Recs for you' })).toBeVisible()
  const line = bob.getByText(`${ALICE.username} says watch ${INCEPTION.title} high`)
  await expect(line).toBeVisible()
  await expect(bob.getByText(NOTE)).toBeVisible()
  await bob.getByRole('button', { name: 'Dismiss' }).click()
  await expect(line).toBeHidden()
  await bob.reload()
  await expect(bob.getByRole('heading', { name: 'Recs for you' })).toBeHidden()
  await bobCtx.close()
})

test.describe('bob', () => {
  test.use({ storageState: BOB.state })
  test('movie page puts friends first', async ({ page }) => {
    await page.goto(`/movie/${INCEPTION.tmdbId}`)
    // alice's seeded friends-only sesh: both, recommended
    await expect(page.getByText('1 of 1 friend recommends it drunk and high')).toBeVisible()
  })
})
