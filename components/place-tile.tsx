import { Beer, Coffee, Croissant, IceCreamCone, Sandwich, Utensils, UtensilsCrossed, type LucideIcon } from 'lucide-react'
import type { PlaceSummary } from '@/lib/subject'

const ICONS: Record<string, LucideIcon> = {
  fast_food: Sandwich, restaurant: UtensilsCrossed, cafe: Coffee, bar: Beer, pub: Beer,
  ice_cream: IceCreamCone, bakery: Croissant, confectionery: Croissant, deli: Sandwich,
}

export function PlaceTile({ place, size = 'card', showName = true }: { place: PlaceSummary; size?: 'card' | 'sm'; showName?: boolean }) {
  const Icon = (place.category && ICONS[place.category]) || Utensils
  const card = size === 'card'
  return (
    <span
      className={`flex shrink-0 flex-col items-center justify-center gap-2 overflow-hidden rounded-poster bg-raised p-2 text-center ${card ? 'h-[162px] w-[108px]' : 'aspect-[2/3] w-[72px]'}`}
    >
      <Icon aria-hidden className={card ? 'size-8 text-muted' : 'size-5 text-muted'} />
      {showName && <span className={`font-display line-clamp-3 leading-tight ${card ? 'text-base' : 'text-xs'}`}>{place.name}</span>}
    </span>
  )
}
