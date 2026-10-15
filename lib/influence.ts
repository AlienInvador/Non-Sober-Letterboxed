export type Influence = 'drunk' | 'high' | 'both' | 'sober'

export function influenceFromChips(c: { drunk: boolean; high: boolean; sober: boolean }): Influence | null {
  if (c.drunk && c.high) return 'both'
  if (c.drunk) return 'drunk'
  if (c.high) return 'high'
  return c.sober ? 'sober' : null
}

const RECOMMEND: Record<Influence, string | null> = {
  drunk: 'Recommend it drunk?',
  high: 'Recommend it high?',
  both: 'Recommend it drunk and high?',
  sober: null,
}
export const recommendLabel = (i: Influence) => RECOMMEND[i]

export const verdict = (r: boolean | null) => (r === null ? '' : r ? 'recommends it' : 'would skip it')

const LABEL: Record<Influence, string> = { drunk: 'Drunk', high: 'High', both: 'Both', sober: 'Sober' }
export const influenceLabel = (i: Influence) => LABEL[i]

const FILTERS = ['all', 'high', 'drunk', 'both']
export const normalizeInfluenceFilter = (v: string | undefined) => (v && FILTERS.includes(v) ? v : 'all')
