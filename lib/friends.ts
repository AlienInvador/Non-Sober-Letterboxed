// friendships has check (user_a < user_b)
export const orderedPair = (a: string, b: string): [string, string] => (a < b ? [a, b] : [b, a])
export const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`)
