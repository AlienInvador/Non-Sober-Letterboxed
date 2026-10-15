import { LogSheetProvider } from '@/components/log-sheet'
import { NavRail } from '@/components/nav-rail'
import { CommandPalette } from '@/components/command-palette'
import { TabBar } from '@/components/tab-bar'
import { createServerClient } from '@/lib/supabase/server'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sb = await createServerClient()
  const { data: auth } = await sb.auth.getUser()
  const { data: prof } = auth.user
    ? await sb.from('profiles').select('username').eq('id', auth.user.id).maybeSingle()
    : { data: null }
  const username = prof?.username ?? ''
  return (
    <LogSheetProvider>
      <div className="flex">
        <NavRail username={username} />
        <div className="min-w-0 flex-1 pb-20 md:pb-0">{children}</div>
      </div>
      <TabBar username={username} />
      <CommandPalette />
    </LogSheetProvider>
  )
}
