import type { Influence } from '@/lib/influence'

const KEYS: Influence[] = ['drunk', 'high', 'both', 'sober']

// Percentages sum to 100 (largest-remainder rounding); empty gives zeros.
export function influenceBreakdown(rows: { influence: Influence }[]): Record<Influence, number> {
  const out = { drunk: 0, high: 0, both: 0, sober: 0 }
  if (!rows.length) return out
  const raw = KEYS.map((k) => ({ k, v: (rows.filter((r) => r.influence === k).length * 100) / rows.length }))
  for (const r of raw) out[r.k] = Math.floor(r.v)
  let left = 100 - KEYS.reduce((s, k) => s + out[k], 0)
  for (const r of [...raw].sort((a, b) => (b.v % 1) - (a.v % 1))) if (left > 0 && r.v % 1 > 0) { out[r.k]++; left-- }
  return out
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
// "2026-10-14" to "October 2026"; string slicing, so no timezone shift.
export const monthLabel = (ymd: string) => `${MONTHS[Number(ymd.slice(5, 7)) - 1]} ${ymd.slice(0, 4)}`
