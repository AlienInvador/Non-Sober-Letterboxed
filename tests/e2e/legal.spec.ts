import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const TMDB = 'This product uses the TMDB API but is not endorsed or certified by TMDB.'
const OSM = '© OpenStreetMap contributors'
const CONSENT = "I'm 21+ and agree to the Terms and Privacy Policy"

test.use({ storageState: { cookies: [], origins: [] } })

async function serious(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  return violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 4).join(' | ')}`)
}

for (const path of ['/terms', '/privacy']) {
  test(`${path} loads signed out with no age cookie, has footer attributions, passes axe`, async ({ page }) => {
    const res = await page.goto(path)
    expect(res?.status()).toBe(200)
    await expect(page).toHaveURL(new RegExp(`${path}$`))
    await expect(page.getByText('Beta draft, not reviewed by a lawyer.')).toBeVisible()
    await expect(page.getByText('contact@REPLACE-ME.example').first()).toBeVisible()
    const footer = page.getByRole('contentinfo')
    await expect(footer).toContainText(TMDB)
    await expect(footer).toContainText(OSM)
    expect(await serious(page)).toEqual([])
  })
}

test('landing footer links to terms and privacy', async ({ page, context }) => {
  await context.addCookies([{ name: 'age_ok', value: '1', domain: 'localhost', path: '/' }])
  await page.goto('/')
  const footer = page.getByRole('contentinfo')
  await expect(footer.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms')
  await expect(footer.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy')
})

test('sign-up submit stays disabled until consent is checked', async ({ page, context }) => {
  await context.addCookies([{ name: 'age_ok', value: '1', domain: 'localhost', path: '/' }])
  await page.goto('/auth/signup')
  const submit = page.getByRole('button', { name: 'Create account' })
  await expect(submit).toBeDisabled()
  const box = page.getByLabel(CONSENT)
  await expect(page.getByRole('link', { name: 'Terms', exact: true }).first()).toHaveAttribute('href', '/terms')
  await expect(page.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy')
  await box.check()
  await expect(submit).toBeEnabled()
  await box.uncheck()
  await expect(submit).toBeDisabled()
})
