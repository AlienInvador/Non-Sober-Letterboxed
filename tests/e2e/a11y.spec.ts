import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const AGE = { name: 'age_ok', value: '1', domain: 'localhost', path: '/' }
const signedOut = { storageState: { cookies: [], origins: [] } }

async function serious(page: Page) {
  // let finite entry animations (.rise stagger) settle: mid-fade colors give false contrast results
  await page.evaluate(() =>
    Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished)),
  )
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  return violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 4).join(' | ')}`)
}

test.describe('a11y signed out', () => {
  test.use(signedOut)

  test('/gate', async ({ page }) => {
    await page.goto('/gate')
    await expect(page.locator('main, form').first()).toBeVisible()
    expect(await serious(page)).toEqual([])
  })

  test('/ landing', async ({ page, context }) => {
    await context.addCookies([AGE])
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    // scroll-reveal sections start hidden below the fold; reveal them all so axe sees final colors
    await page.evaluate(async () => {
      for (let y = 0; y <= document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)) }
    })
    await expect.poll(() => page.evaluate(() => [...document.querySelectorAll('main section')].every((e) => getComputedStyle(e).opacity === '1'))).toBe(true)
    expect(await serious(page)).toEqual([])
  })

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' })
    test('transition wrapper and marquee are static', async ({ page, context }) => {
      await context.addCookies([AGE])
      await page.goto('/')
      const wrap = page.getByTestId('page-transition')
      await expect(wrap).toBeAttached()
      const s = await wrap.evaluate((el) => getComputedStyle(el))
      expect(['none', '']).toContain(s.transform === 'none' ? 'none' : s.transform)
      expect(s.animationName).toBe('none')
      const m = await page.getByTestId('marquee-track').evaluate((el) => getComputedStyle(el).animationName)
      expect(m).toBe('none')
    })
  })
})

test.describe('a11y signed in', () => {
  for (const path of ['/', '/discover', '/movie/27205']) {
    test(`${path}`, async ({ page }) => {
      await page.goto(path)
      await expect(page.locator('main h1, main h2').first()).toBeVisible()
      expect(await serious(page)).toEqual([])
    })
  }
})
