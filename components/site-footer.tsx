import Link from 'next/link'

export function SiteFooter() {
  return (
    <footer className="flex flex-col items-center gap-2 px-4 py-8 text-center text-sm text-faint">
      <nav aria-label="Legal" className="flex gap-4">
        <Link href="/terms" className="underline">Terms</Link>
        <Link href="/privacy" className="underline">Privacy</Link>
      </nav>
      <p>This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
      <p>© OpenStreetMap contributors</p>
    </footer>
  )
}
