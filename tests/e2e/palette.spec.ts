import { test, expect } from '@playwright/test'
import { ALICE, INCEPTION } from './helpers'

test.use({ storageState: ALICE.state })

test('ctrl+k search finds Inception and navigates', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Control+k')
  const input = page.getByPlaceholder('Search movies, people, lists')
  await expect(input).toBeVisible()
  await input.fill('incep')
  await expect(page.getByRole('group', { name: 'Movies' }).getByText('Inception').first()).toBeVisible()
  await page.keyboard.press('Enter')
  await page.waitForURL(`**/movie/${INCEPTION.tmdbId}`)
})

test('escape closes, ctrl+k toggles', async ({ page }) => {
  await page.goto('/')
  await expect(async () => {
    await page.keyboard.press('Control+k') // retry until hydrated
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 1000 })
  }).toPass()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
})

test('TMDB 502 shows retry', async ({ page }) => {
  let fail = true
  await page.route('**/api/tmdb/search**', (r) => (fail ? r.fulfill({ status: 502, json: { error: 'tmdb_unavailable' } }) : r.continue()))
  await page.goto('/')
  await page.keyboard.press('Control+k')
  await page.getByPlaceholder('Search movies, people, lists').fill('incep')
  await expect(page.getByText('Search is down — retry')).toBeVisible()
  fail = false
  await page.getByRole('button', { name: 'Search is down — retry' }).click()
  await expect(page.getByText('Inception').first()).toBeVisible()
})
