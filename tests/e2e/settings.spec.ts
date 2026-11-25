import { test, expect, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { TEST_PASSWORD, INCEPTION } from './helpers'

const NEW_PASSWORD = 'e2e-Changed-9876!'
const admin = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } })

async function removeUser(email: string) {
  const { data } = await admin().auth.admin.listUsers({ perPage: 1000 })
  const u = data.users.find((x) => x.email === email)
  if (u) await admin().auth.admin.deleteUser(u.id)
}
async function makeUser(tag: string) {
  const email = `e2e-settings-${tag}@test.local`
  const username = `e2e_set_${tag}`
  await removeUser(email)
  const { data, error } = await admin().auth.admin.createUser({ email, password: TEST_PASSWORD, email_confirm: true })
  if (error) throw error
  const { error: pe } = await admin().from('profiles').insert({ id: data.user.id, username, birthdate: '1990-01-01' })
  if (pe) throw pe
  return { email, username }
}
async function logIn(page: Page, email: string, password: string) {
  await page.goto('/auth/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Log in' }).click()
}

test.use({ storageState: { cookies: [], origins: [] } })
test.describe.configure({ mode: 'serial' })
test.beforeEach(async ({ context }) => {
  await context.addCookies([{ domain: 'localhost', path: '/', name: 'age_ok', value: '1', httpOnly: true },
    { domain: 'localhost', path: '/', name: 'dob', value: '1990-02-02', httpOnly: true }])
})

let pw: { email: string; username: string }
let del: { email: string; username: string }
test.beforeAll(async () => { pw = await makeUser('pw'); del = await makeUser('del') })
test.afterAll(async () => { await removeUser(pw.email); await removeUser(del.email) })

test('change password, log out, log in with the new one; short one blocked', async ({ page }) => {
  await logIn(page, pw.email, TEST_PASSWORD)
  await expect(page).not.toHaveURL(/\/auth/)
  await page.goto('/settings')
  await page.getByLabel('New password').fill('short')
  await page.getByRole('button', { name: 'Change password' }).click()
  await expect(page.locator('main').getByRole('alert')).toHaveText('Use at least 8 characters.')
  await page.getByLabel('New password').fill(NEW_PASSWORD)
  await page.getByRole('button', { name: 'Change password' }).click()
  await expect(page.getByText('Password updated')).toBeVisible()
  await page.getByRole('button', { name: 'Log out' }).first().click()
  await expect(page.getByRole('link', { name: 'Get in' }).first()).toBeVisible()
  await logIn(page, pw.email, NEW_PASSWORD)
  await expect(page).not.toHaveURL(/\/auth/)
})

test('default visibility preselects in the log sheet', async ({ page }) => {
  await logIn(page, pw.email, NEW_PASSWORD)
  await expect(page).not.toHaveURL(/\/auth/)
  await page.goto('/settings')
  await page.getByLabel('Default visibility').selectOption('public')
  await expect(page.getByText('Saved')).toBeVisible()
  await page.route('**/api/tmdb/search*', (r) => r.fulfill({ json: [INCEPTION] }))
  await page.goto('/')
  await page.getByRole('button', { name: /Log/ }).first().click()
  await page.getByPlaceholder('Search a movie').fill('incep')
  await page.getByRole('option', { name: /Inception/ }).click()
  await page.getByRole('button', { name: /More/ }).click()
  await expect(page.getByLabel('Visibility')).toHaveValue('public')
})

test('delete account needs the username, then the login is gone', async ({ page }) => {
  await logIn(page, del.email, TEST_PASSWORD)
  await expect(page).not.toHaveURL(/\/auth/)
  await page.goto('/settings')
  await page.getByRole('button', { name: 'Delete account' }).click()
  const dialog = page.getByRole('alertdialog')
  await dialog.getByLabel('Your username').fill('nope_wrong')
  await dialog.getByRole('button', { name: 'Delete forever' }).click()
  await expect(dialog.getByRole('alert')).toHaveText('Type your username exactly to confirm.')
  await dialog.getByLabel('Your username').fill(del.username.toUpperCase())
  await dialog.getByRole('button', { name: 'Delete forever' }).click()
  await expect(page).toHaveURL(/\/$/)
  await logIn(page, del.email, TEST_PASSWORD)
  await expect(page.locator('main').getByRole('alert')).toContainText(/invalid/i)
})
