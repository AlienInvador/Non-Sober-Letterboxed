import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { signOut } from '@/actions/auth'
import { SettingsForms, DeleteAccount } from '@/components/settings-forms'

export default async function SettingsPage() {
  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: prof } = await sb.from('profiles').select('username, default_visibility').eq('id', user.id).maybeSingle()
  if (!prof) redirect('/onboarding')
  return (
    <main className="flex max-w-xl flex-col gap-10 p-10">
      <h1 className="font-display text-4xl">Settings</h1>
      <SettingsForms email={user.email ?? ''} defaultVisibility={prof.default_visibility} />
      <form action={signOut}>
        <button type="submit" className="rounded-full bg-raised px-6 py-3">Log out</button>
      </form>
      <DeleteAccount username={prof.username} />
    </main>
  )
}
