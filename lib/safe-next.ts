// A post-login redirect target is only trusted when it is a same-origin path: "/x", never "//host" or "/\host".
export function safeNext(s: string | null | undefined): string | null {
  if (typeof s !== 'string' || s.length > 2000) return null
  if (!s.startsWith('/') || s.startsWith('//') || s.startsWith('/\\')) return null
  for (const ch of s) {
    const c = ch.charCodeAt(0)
    if (c < 0x20 || c === 0x7f || ch === '\\') return null
  }
  return s
}
