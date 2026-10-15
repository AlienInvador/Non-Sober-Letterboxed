import { test, expect } from '@playwright/test'
import { ALICE } from './helpers'

test.use({ storageState: ALICE.state })

test('discover shows tabs and tab switch updates URL', async ({ page }) => {
  await page.goto('/discover')
  await expect(page.getByRole('heading', { name: 'What should we watch tonight?', level: 1 })).toBeVisible()
  for (const n of ['Best high', 'Best drunk', 'Best both']) await expect(page.getByRole('tab', { name: n })).toBeVisible()
  await page.getByRole('tab', { name: 'Best drunk' }).click()
  await expect(page).toHaveURL(/tab=drunk/)
  await expect(page.getByRole('tab', { name: 'Best drunk' })).toHaveAttribute('aria-selected', 'true')
})
