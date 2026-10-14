import { test, expect } from '@playwright/test'
import { ALICE } from './helpers'

test.use({ storageState: ALICE.state })
test('alice sees bob under friends', async ({ page }) => {
  await page.goto('/friends')
  await expect(page.getByRole('heading', { name: 'Friends', level: 1 })).toBeVisible()
  await expect(page.getByText('@e2e_bob')).toBeVisible()
})
