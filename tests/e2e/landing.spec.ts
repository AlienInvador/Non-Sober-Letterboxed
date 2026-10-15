import { test, expect } from '@playwright/test'

test.describe('signed out', () => {
  test.use({ storageState: { cookies: [], origins: [] } })
  test.beforeEach(async ({ context }) => {
    await context.addCookies([{ name: 'age_ok', value: '1', domain: 'localhost', path: '/' }])
  })

  test('landing renders at / with no nav rail', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/localhost:3000\/$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Movies hit different drunk or high.' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Get in' }).first()).toHaveAttribute('href', '/auth/login')
    await expect(page.getByText('This product uses the TMDB API but is not endorsed or certified by TMDB.')).toBeVisible()
    await expect(page.getByText('Know your limits, never drive after, look out for each other.')).toBeVisible()
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0)
  })

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' })
    test('marquee does not animate', async ({ page }) => {
      await page.goto('/')
      const track = page.getByTestId('marquee-track')
      await expect(track).toBeAttached()
      const name = await track.evaluate((el) => getComputedStyle(el).animationName)
      expect(name).toBe('none')
    })
  })
})

test('signed in / still shows Tonight', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Movies hit different drunk or high.' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Get in' })).toHaveCount(0)
  await expect(page.getByRole('heading', { level: 1, name: 'Tonight' })).toBeAttached()
})
