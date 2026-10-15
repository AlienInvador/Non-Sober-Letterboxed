export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-card bg-card p-8 text-center">
      <h3 className="font-display text-2xl">{title}</h3>
      <div className="mt-3 flex flex-col items-center gap-4 text-muted">{children}</div>
    </div>
  )
}
