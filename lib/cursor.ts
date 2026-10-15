export type FeedCursor = { createdAt: string; id: string }

export const encodeCursor = (c: FeedCursor): string => Buffer.from(`${c.createdAt}|${c.id}`).toString('base64url')

export function decodeCursor(s: string): FeedCursor | null {
  const [createdAt, id, ...rest] = Buffer.from(s, 'base64url').toString().split('|')
  const ok = createdAt && id && !rest.length && !Number.isNaN(Date.parse(createdAt)) && /^[0-9a-f-]{36}$/i.test(id)
  return ok ? { createdAt, id } : null
}
