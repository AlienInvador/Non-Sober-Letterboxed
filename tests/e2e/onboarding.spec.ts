import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { TEST_PASSWORD } from './helpers'

const DANA = { email: 'e2e-dana@test.local', username: 'e2e_dana' }
const admin = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } })

async function removeDana() {
  const { data } = await admin().auth.admin.listUsers({ perPage: 1000 })
  const u = data.users.find((x) => x.email === DANA.email)
  if (u) await admin().auth.admin.deleteUser(u.id) // profile cascades
}

test.use({ storageState: { cookies: [], origins: [] } })
test.beforeAll(removeDana)
test.afterAll(removeDana)

test('onboarding reuses the gate birthdate', async ({ page, context }) => {
  const { data, error } = await admin().auth.admin.createUser({ email: DANA.email, password: TEST_PASSWORD, email_confirm: true })
  if (error) throw error

  const jar = new Map<string, string>()
  const client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (list) => list.forEach(({ name, value }) => jar.set(name, value)),
    },
  })
  await client.auth.signInWithPassword({ email: DANA.email, password: TEST_PASSWORD })
  const base = { domain: 'localhost', path: '/' }
  await context.addCookies([
    ...[...jar].map(([name, value]) => ({ ...base, name, value })),
    { ...base, name: 'age_ok', value: '1', httpOnly: true },
    { ...base, name: 'dob', value: '1990-02-02', httpOnly: true },
  ])

  await page.goto('/onboarding')
  await expect(page.getByRole('heading', { name: 'Set up your profile' })).toBeVisible()
  await expect(page.getByLabel('Date of birth')).toHaveCount(0)
  await page.getByLabel('Username').fill(DANA.username)
  await page.getByRole('button', { name: 'Join' }).click()
  await expect(page).not.toHaveURL(/onboarding/)

  const { data: profile } = await admin().from('profiles').select('birthdate').eq('id', data.user.id).single()
  expect(profile?.birthdate).toBe('1990-02-02')
})
