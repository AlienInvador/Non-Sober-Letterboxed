import { test, expect } from '@playwright/test'

test('under 21 is turned away', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/gate/)
  await page.getByLabel('Date of birth').fill('2010-01-01')
  await page.getByRole('button', { name: 'Enter' }).click()
  await expect(page.getByText('Come back when you’re 21')).toBeVisible()
})
test('21+ passes to login', async ({ page }) => {
  await page.goto('/gate')
  await page.getByLabel('Date of birth').fill('1995-05-05')
  await page.getByRole('button', { name: 'Enter' }).click()
  await expect(page).toHaveURL(/\/auth\/login/)
})
