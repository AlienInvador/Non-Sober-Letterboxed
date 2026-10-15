import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { ALICE, INCEPTION } from './helpers'

const TITLE = 'Late night bangers'
const SECOND = { tmdbId: 603, title: 'The Matrix' }

function admin() {
  process.loadEnvFile('.env.local')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } })
}
async function cleanup() {
  const a = admin()
  const { data: p } = await a.from('profiles').select('id').eq('username', ALICE.username).single()
  await a.from('lists').delete().eq('owner_id', p!.id).eq('title', TITLE)
  await a.from('queue').delete().eq('user_id', p!.id)
}
test.beforeAll(async () => {
  await cleanup()
  const { error } = await admin().from('movies').upsert({ tmdb_id: SECOND.tmdbId, title: SECOND.title, genres: [], cached_at: new Date().toISOString() })
  if (error) throw new Error(error.message)
})
test.afterAll(cleanup)

test('queue: add from movie page, see on /queue, remove', async ({ page }) => {
  await page.goto(`/movie/${INCEPTION.tmdbId}`)
  await page.getByRole('button', { name: 'Add to queue' }).click()
  await expect(page.getByRole('button', { name: 'In your queue' })).toHaveAttribute('aria-pressed', 'true')
  await page.goto('/queue')
  await expect(page.getByRole('heading', { name: 'Your queue' })).toBeVisible()
  await expect(page.getByRole('link', { name: INCEPTION.title }).first()).toBeVisible()
  await page.getByRole('button', { name: `Remove ${INCEPTION.title} from your queue` }).click()
  await expect(page.getByText('Nothing queued.')).toBeVisible()
})

test('list: create, add two movies, reorder with Move buttons', async ({ page }) => {
  test.setTimeout(60_000)
  await page.goto(`/movie/${INCEPTION.tmdbId}`)
  await page.getByRole('button', { name: 'Add to list' }).click()
  await page.getByRole('button', { name: 'New list…' }).click()
  await page.getByLabel('List title').fill(TITLE)
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(page.getByText('Added to your new list.')).toBeVisible()

  await page.goto(`/movie/${SECOND.tmdbId}`)
  await page.getByRole('button', { name: 'Add to list' }).click()
  await page.getByRole('button', { name: TITLE }).click()
  await expect(page.getByText(`Added to ${TITLE}.`)).toBeVisible()

  await page.goto(`/movie/${INCEPTION.tmdbId}`)
  await page.getByRole('button', { name: 'Add to list' }).click()
  await page.getByRole('button', { name: TITLE }).click()
  await expect(page.getByText('Already on that list.')).toBeVisible()

  await page.goto(`/u/${ALICE.username}`)
  await page.getByRole('link', { name: new RegExp(TITLE) }).click()
  await expect(page.getByRole('heading', { name: TITLE })).toBeVisible()
  const rows = page.locator('ol > li')
  await expect(rows.first()).toContainText(INCEPTION.title)
  await page.getByRole('button', { name: `Move ${INCEPTION.title} down` }).click()
  await expect(rows.first()).toContainText(SECOND.title)
  await page.reload()
  await expect(rows.first()).toContainText(SECOND.title)
})
