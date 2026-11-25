import { test, expect, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { TEST_PASSWORD } from './helpers'

const EMAIL = 'e2e-auth-new@test.local'
const USERNAME = 'e2e_auth_new'
const NEW_PASSWORD = 'e2e-Changed-9876!'
const admin = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } })

async function removeUser() {
  const { data } = await admin().auth.admin.listUsers({ perPage: 1000 })
  const u = data.users.find((x) => x.email === EMAIL)
  if (u) await admin().auth.admin.deleteUser(u.id) // profile cascades
}

test.use({ storageState: { cookies: [], origins: [] } })
test.describe.configure({ mode: 'serial' })
test.beforeAll(removeUser)
test.afterAll(removeUser)
test.beforeEach(async ({ context }) => {
  await context.addCookies([{ domain: 'localhost', path: '/', name: 'age_ok', value: '1', httpOnly: true },
    { domain: 'localhost', path: '/', name: 'dob', value: '1990-02-02', httpOnly: true },
  ])
})

async function logIn(page: Page, password: string) {
  await page.goto('/auth/login')
  await page.getByLabel('Email').fill(EMAIL)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Log in' }).click()
}

test('sign up lands on onboarding, then log out and log in with the password', async ({ page }) => {
  await page.goto('/auth/signup')
  await page.getByLabel('Email').fill(EMAIL)
  await page.getByLabel('Password').fill(TEST_PASSWORD)
  await page.getByLabel("I'm 21+ and agree to the Terms and Privacy Policy").check()
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL(/\/onboarding/)
  await page.getByLabel('Username').fill(USERNAME)
  await page.getByRole('button', { name: 'Join' }).click()
  await expect(page).not.toHaveURL(/onboarding/)

  await page.getByRole('button', { name: 'Log out' }).first().click()
  await expect(page.getByRole('link', { name: 'Get in' }).first()).toBeVisible()
  await logIn(page, TEST_PASSWORD)
  await expect(page).not.toHaveURL(/\/auth|onboarding/)
})

test('wrong password shows the error', async ({ page }) => {
  await logIn(page, 'not-the-password')
  await expect(page.locator('main').getByRole('alert')).toContainText(/invalid/i)
})

test('short password is blocked client-side', async ({ page }) => {
  await page.goto('/auth/signup')
  await page.getByLabel('Email').fill('short@test.local')
  await page.getByLabel("I'm 21+ and agree to the Terms and Privacy Policy").check()
  await page.getByLabel('Password').fill('short')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.locator('main').getByRole('alert')).toHaveText('Use at least 8 characters.')
})

test('reset page shows check your email', async ({ page }) => {
  await page.goto('/auth/reset')
  await page.getByLabel('Email').fill(EMAIL)
  await page.getByRole('button', { name: 'Send reset link' }).click()
  await expect(page.getByText('Check your email')).toBeVisible()
})

test('expired link error shows on login', async ({ page }) => {
  await page.goto('/auth/callback')
  await expect(page).toHaveURL(/error=link/)
  await expect(page.locator('main').getByRole('alert')).toHaveText('That link expired. Try again.')
})

test('update-password without a session offers sign in', async ({ page }) => {
  await page.goto('/auth/update-password')
  await expect(page.getByRole('link', { name: /sign in first/i })).toBeVisible()
})

test('signed-in user sets a new password and logs in with it', async ({ page }) => {
  await logIn(page, TEST_PASSWORD)
  await expect(page).not.toHaveURL(/\/auth/)
  await page.goto('/auth/update-password')
  await page.getByLabel('New password').fill(NEW_PASSWORD)
  await page.getByRole('button', { name: 'Update password' }).click()
  await expect(page).not.toHaveURL(/update-password/)

  await page.getByRole('button', { name: 'Log out' }).first().click()
  await expect(page.getByRole('link', { name: 'Get in' }).first()).toBeVisible()
  await logIn(page, NEW_PASSWORD)
  await expect(page).not.toHaveURL(/\/auth/)
})

test('auth forms post, so a pre-hydration submit never puts the password in the URL', async ({ page }) => {
  for (const path of ['/auth/login', '/auth/signup', '/auth/reset']) {
    await page.goto(path)
    await expect(page.locator('main form')).toHaveAttribute('method', 'post')
  }
})
