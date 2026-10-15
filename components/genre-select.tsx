'use client'
import { useRouter } from 'next/navigation'

export function GenreSelect({ tab, genre, genres }: { tab: string; genre: string; genres: string[] }) {
  const router = useRouter()
  return (
    <select
      aria-label="Genre" value={genre}
      onChange={(e) => router.push(`/discover?tab=${tab}${e.target.value ? `&genre=${encodeURIComponent(e.target.value)}` : ''}`)}
      className="rounded-full bg-raised px-4 py-2 text-sm text-body"
    >
      <option value="">Any genre</option>
      {genres.map((g) => <option key={g} value={g}>{g}</option>)}
    </select>
  )
}
