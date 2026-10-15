export function relativeTime(iso: string, now: number = Date.now()): string {
  const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000))
  const units: [string, number][] = [['w', 604800], ['d', 86400], ['h', 3600], ['m', 60]]
  for (const [u, n] of units) if (s >= n) return `${Math.floor(s / n)}${u} ago`
  return 'just now'
}
