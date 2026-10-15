// Strict: only digits and ISO punctuation can reach the PostgREST filter. Not re-serialized, to keep microseconds.
const TS = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}(:?\d{2})?)$/

export type FeedCursor = { createdAt: string; id: string }

export const encodeCursor = (c: FeedCursor): string => Buffer.from(`${c.createdAt}|${c.id}`).toString('base64url')

export function decodeCursor(s: string): FeedCursor | null {
  const [createdAt, id, ...rest] = Buffer.from(s, 'base64url').toString().split('|')
  const ok = createdAt && TS.test(createdAt) && id && !rest.length && !Number.isNaN(Date.parse(createdAt)) && /^[0-9a-f-]{36}$/i.test(id)
  return ok ? { createdAt, id } : null
}
