'use client'
import { useLogSheet } from '@/components/log-sheet'
import type { PlaceCategory } from '@/lib/places'
import type { PlaceSummary } from '@/lib/subject'

export function PlaceActions({ place }: { place: PlaceSummary }) {
  const { open } = useLogSheet()
  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => open(undefined, { place: { name: place.name, category: place.category as PlaceCategory | null } })}
        className="rounded-full bg-accent-fill px-5 py-3 font-semibold text-white"
      >
        Log this spot
      </button>
    </div>
  )
}
