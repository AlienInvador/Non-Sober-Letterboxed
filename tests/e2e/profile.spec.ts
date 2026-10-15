import { test, expect } from '@playwright/test'
import { ALICE, BOB, CAROL, SEED_REVIEW } from './helpers'

test.describe('as alice', () => {
  test.use({ storageState: ALICE.state })
  test('bob profile shows friends', async ({ page }) => {
    await page.goto(`/u/${BOB.username}`)
    await expect(page.getByText(`@${BOB.username}`)).toBeVisible()
    await expect(page.getByText('Friends ✓')).toBeVisible()
  })
  test('unknown user 404s', async ({ page }) => {
    expect((await page.goto('/u/nobody_here_zz'))?.status()).toBe(404)
  })
})

test.describe('as carol', () => {
  test.use({ storageState: CAROL.state })
  test('stranger sees no friends-only seshes and can add', async ({ page }) => {
    await page.goto(`/u/${ALICE.username}?add=1`)
    await expect(page.getByRole('button', { name: 'Add friend' })).toBeVisible()
    await expect(page.getByText(SEED_REVIEW)).toHaveCount(0)
    await expect(page.getByText('Requested')).toHaveCount(0) // ?add=1 never auto-sends
  })
})
