import { test, expect } from '@playwright/test'

test.use({ storageState: { cookies: [], origins: [] } })

test('under 21 is turned away', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/gate/)
  await page.getByLabel('Date of birth').fill('2010-01-01')
  await page.getByRole('button', { name: 'Enter' }).click()
  await expect(page.getByText('Come back when you’re 21')).toBeVisible()
})
test('21+ passes to the landing page', async ({ page }) => {
  await page.goto('/gate')
  await page.getByLabel('Date of birth').fill('1995-05-05')
  await page.getByRole('button', { name: 'Enter' }).click()
  await expect(page.getByRole('heading', { name: 'Movies hit different drunk or high.' })).toBeVisible()
  // onboarding reuses the gate's birthdate instead of asking again
  const dob = (await page.context().cookies()).find((c) => c.name === 'dob')
  expect(dob?.value).toBe('1995-05-05')
  expect(dob?.httpOnly).toBe(true)
})
