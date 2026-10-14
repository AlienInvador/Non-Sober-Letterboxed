export const formatRecommendPct = (p: number | null): string => (p === null ? '—' : `${Math.round(p)}%`)
