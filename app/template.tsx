// 200ms opacity fade + 8px rise on every navigation, pure CSS so the first paint is already in the "from" state (no flash).
// The global prefers-reduced-motion rule shortens it to ~0ms.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-in" data-testid="page-transition">{children}</div>
}
