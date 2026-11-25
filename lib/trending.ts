export type TrendingRow = { user_id: string; tmdb_id: number | null; place_id: string | null; created_at: string }
export type TrendingKey = { kind: 'movie' | 'place'; id: string; friendCount: number }

export function rankTrending(rows: TrendingRow[], since: string, limit = 8): TrendingKey[] {
  const by = new Map<string, { kind: 'movie' | 'place'; id: string; users: Set<string>; newest: string }>()
  for (const r of rows) {
    if (r.created_at < since) continue
    const kind = r.tmdb_id != null ? 'movie' : r.place_id ? 'place' : null
    if (!kind) continue
    const id = kind === 'movie' ? String(r.tmdb_id) : r.place_id!
    const key = `${kind[0]}:${id}`
    const g = by.get(key) ?? { kind, id, users: new Set<string>(), newest: r.created_at }
    g.users.add(r.user_id)
    if (r.created_at > g.newest) g.newest = r.created_at
    by.set(key, g)
  }
  return [...by.values()]
    .sort((a, b) => b.users.size - a.users.size || (a.newest < b.newest ? 1 : -1))
    .slice(0, limit)
    .map((g) => ({ kind: g.kind, id: g.id, friendCount: g.users.size }))
}
