import { test, expect } from '@playwright/test'
import { BOB, CAROL, SEED_REVIEW } from './helpers'

test.describe('bob', () => {
  test.use({ storageState: BOB.state })

  test('sees alice\'s friends-only sesh on Tonight', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(SEED_REVIEW)).toBeVisible()
    await expect(page.getByText(/e2e_alice/).first()).toBeVisible()
  })

  test('cheers toggles 0 -> 1 -> 0', async ({ page }) => {
    await page.goto('/')
    const card = page.locator('article', { hasText: SEED_REVIEW })
    await expect(card.getByRole('button', { name: 'Cheers, 0 so far' })).toBeVisible()
    // The toggle is optimistic; wait for the server action to commit before reloading.
    const saved = (p: typeof page) => p.waitForResponse((r) => r.request().method() === 'POST' && !!r.request().headers()['next-action'])
    await Promise.all([saved(page), card.getByRole('button', { name: 'Cheers, 0 so far' }).click()])
    await expect(card.getByRole('button', { name: 'Cheers, 1 so far' })).toHaveAttribute('aria-pressed', 'true')
    await page.reload()
    await expect(card.getByRole('button', { name: 'Cheers, 1 so far' })).toBeVisible()
    await Promise.all([saved(page), card.getByRole('button', { name: 'Cheers, 1 so far' }).click()])
    await expect(card.getByRole('button', { name: 'Cheers, 0 so far' })).toHaveAttribute('aria-pressed', 'false')
  })

  test('crew: create, add alice, see crew page', async ({ page }) => {
    await page.goto('/crews')
    await page.getByLabel('Crew name').fill('Couch Crew')
    await page.getByRole('button', { name: 'Start a crew' }).click()
    await expect(page.getByRole('heading', { name: 'Couch Crew', level: 1 })).toBeVisible()
    await page.getByLabel('Add a friend by username').fill('e2e_alice')
    await page.getByRole('button', { name: 'Add' }).click()
    await expect(page.getByRole('link', { name: /e2e_alice/ })).toBeVisible()
    await expect(page.getByText('No crew lists yet.')).toBeVisible()
  })
})

test.describe('carol (new user)', () => {
  test.use({ storageState: CAROL.state })
  test('sees empty state with invite link', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Log your first sesh' })).toBeVisible()
    await expect(page.getByText(/\/u\/e2e_carol\?add=1/)).toBeVisible()
  })
})
