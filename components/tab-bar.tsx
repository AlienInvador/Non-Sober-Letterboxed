'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLogSheet } from '@/components/log-sheet'
import { isActive, navItems } from '@/components/nav-rail'

export function TabBar({ username }: { username: string }) {
  const path = usePathname()
  const { open } = useLogSheet()
  const [tonight, discover, crews, me] = navItems(username)
  const tab = (i: { href: string; label: string }) => (
    <Link
      key={i.label}
      href={i.href}
      aria-current={isActive(path, i.href) ? 'page' : undefined}
      className="flex-1 py-3 text-center text-xs text-muted aria-[current=page]:text-text"
    >
      {i.label}
    </Link>
  )
  return (
    <nav aria-label="Tabs" className="fixed inset-x-0 bottom-0 z-30 flex items-center border-t border-line bg-bg md:hidden">
      {tab(tonight)}
      {tab(discover)}
      <button type="button" onClick={() => open()} className="mx-1 -mt-4 rounded-full bg-accent-fill px-4 py-3 text-xs font-semibold text-white">
        Log
      </button>
      {tab(crews)}
      {tab(me)}
    </nav>
  )
}
