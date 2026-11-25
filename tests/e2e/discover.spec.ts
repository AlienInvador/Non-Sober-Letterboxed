import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { ALICE, BOB } from './helpers'

test.use({ storageState: ALICE.state })

test('discover shows tabs and tab switch updates URL', async ({ page }) => {
  await page.goto('/discover')
  await expect(page.getByRole('heading', { name: 'What should we watch tonight?', level: 1 })).toBeVisible()
  for (const n of ['Best high', 'Best drunk', 'Best both']) await expect(page.getByRole('tab', { name: n })).toBeVisible()
  await page.getByRole('tab', { name: 'Best drunk' }).click()
  await expect(page).toHaveURL(/tab=drunk/)
  await expect(page.getByRole('tab', { name: 'Best drunk' })).toHaveAttribute('aria-selected', 'true')
})

test('a friend\'s food spot shows in Trending with friends, and a crew page still loads', async ({ page }) => {
  process.loadEnvFile('.env.local') // does not override the e2e vars playwright.config already set
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } })
  const { data: bob } = await admin.from('profiles').select('id').eq('username', BOB.username).single()
  const { data: place, error } = await admin.from('places').upsert({ name: 'Trend Test Tacos', category: 'restaurant' }, { onConflict: 'name_key' }).select('id').single()
  if (error) throw new Error(error.message)
  await admin.from('sessions').delete().eq('place_id', place!.id)
  const ins = await admin.from('sessions').insert({ user_id: bob!.id, place_id: place!.id, influence: 'high', recommend: true, visibility: 'friends' })
  if (ins.error) throw new Error(ins.error.message)
  try {
    await page.goto('/discover?tab=high')
    const strip = page.locator('section', { has: page.getByRole('heading', { name: 'Trending with friends' }) })
    await expect(strip.getByText('Trend Test Tacos')).toBeVisible()
    await expect(strip.getByText('1 friend went')).toBeVisible()
    await expect(strip.getByRole('link', { name: /Trend Test Tacos/ })).toHaveAttribute('href', `/place/${place!.id}`)

    await page.goto('/crews')
    await page.getByLabel('Crew name').fill('Trend Crew')
    await page.getByRole('button', { name: 'Start a crew' }).click()
    await expect(page.getByRole('heading', { name: 'Trend Crew', level: 1 })).toBeVisible()
  } finally {
    await admin.from('sessions').delete().eq('place_id', place!.id)
    await admin.from('places').delete().eq('id', place!.id)
    await admin.from('crews').delete().eq('name', 'Trend Crew')
  }
})
