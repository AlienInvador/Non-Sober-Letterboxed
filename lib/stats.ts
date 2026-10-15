export const formatRecommendPct = (p: number | null): string => (p === null ? '—' : `${Math.round(p)}%`)

import type { Influence } from '@/lib/influence'

export const MIN_LOGS = 5

type Row = { tmdbId: number; influence: Influence; logCount: number; recommendPct: number | null }
export function rankForDiscover<T extends Row>(rows: T[], influence: Exclude<Influence, 'sober'>, minLogs = MIN_LOGS): T[] {
  return rows
    .filter((r) => r.influence === influence && r.logCount >= minLogs && r.recommendPct !== null)
    .sort((a, b) => b.recommendPct! - a.recommendPct! || b.logCount - a.logCount)
}
