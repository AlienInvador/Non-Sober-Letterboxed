// Matches Postgres: birthdate + 21 years (Feb 29 -> Feb 28) <= today. UTC calendar dates.
export function isAtLeast21(birthdate: string, today: Date = new Date()): boolean {
  const [y, m, d] = birthdate.split('-').map(Number)
  const lastDay = new Date(Date.UTC(y + 21, m, 0)).getUTCDate()
  const cutoff = Date.UTC(y + 21, m - 1, Math.min(d, lastDay))
  const now = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  return cutoff <= now
}
