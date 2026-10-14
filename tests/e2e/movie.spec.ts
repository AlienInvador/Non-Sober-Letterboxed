import { test, expect } from '@playwright/test'

test('movie page shows title and split ratings', async ({ page }) => {
  await page.goto('/movie/27205')
  await expect(page.getByRole('heading', { name: 'Inception', level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'How it hits' })).toBeVisible()
})
