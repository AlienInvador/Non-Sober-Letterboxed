import { test, expect, type Page } from '@playwright/test'
import { INCEPTION } from './helpers'

async function pickInception(page: Page) {
  await page.route('**/api/tmdb/search*', (r) => r.fulfill({ json: [INCEPTION] }))
  await page.goto('/')
  await page.getByRole('button', { name: /Log/ }).first().click()
  await page.getByPlaceholder('Search a movie').fill('incep')
  await page.getByRole('option', { name: /Inception/ }).click()
  await page.getByRole('button', { name: 'Drunk' }).click()
  await page.getByRole('button', { name: 'High' }).click() // -> Both
  await page.getByRole('slider', { name: 'Rating' }).press('ArrowRight')
  await page.getByRole('switch', { name: 'Recommend it drunk and high?' }).click()
}

test('log a session in four steps', async ({ page }) => {
  await pickInception(page)
  await page.getByRole('button', { name: /Save/ }).click()
  await expect(page.getByText('Logged').first()).toBeVisible()
})

test('failed save keeps inputs', async ({ page }) => {
  await pickInception(page)
  // killing the server-action request makes the action reject; the sheet must survive it
  await page.route('**/*', (r) =>
    r.request().method() === 'POST' && r.request().headers()['next-action'] ? r.abort() : r.fallback(),
  )
  await page.getByRole('button', { name: /Save/ }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByRole('slider', { name: 'Rating' })).toHaveAttribute('aria-valuenow', '0.5')
  await expect(page.getByRole('button', { name: /Save/ })).toBeVisible()
})
