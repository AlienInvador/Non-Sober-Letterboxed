'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogButton } from '@/components/log-sheet'
import { signOut } from '@/actions/auth'

export function navItems(username: string) {
  return [
    { href: '/', label: 'Tonight' },
    { href: '/discover', label: 'Discover' },
    { href: '/crews', label: 'Crews' },
    { href: username ? `/u/${username}` : '/friends', label: 'Me' },
  ]
}
export const isActive = (path: string, href: string) => (href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`))

export function NavRail({ username }: { username: string }) {
  const path = usePathname()
  return (
    <nav aria-label="Main" className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col gap-6 p-6 md:flex">
      <span className="font-display text-[22px]">geeked-drunk</span>
      <ul className="flex flex-col gap-1">
        {navItems(username).map((i) => (
          <li key={i.label}>
            <Link
              href={i.href}
              aria-current={isActive(path, i.href) ? 'page' : undefined}
              className="block rounded-control px-3 py-2 text-muted aria-[current=page]:bg-card aria-[current=page]:text-text"
            >
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
      <LogButton />
      <form action={signOut} className="mt-auto">
        <button type="submit" className="rounded-control px-3 py-2 text-sm text-muted">Log out</button>
      </form>
    </nav>
  )
}
