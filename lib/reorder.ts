export function moveItem<T>(arr: T[], from: number, to: number): T[] {
  const out = [...arr]
  if (!Number.isInteger(from) || from < 0 || from >= out.length) return out
  const [x] = out.splice(from, 1)
  out.splice(Math.max(0, Math.min(Math.trunc(to) || 0, out.length)), 0, x)
  return out
}
