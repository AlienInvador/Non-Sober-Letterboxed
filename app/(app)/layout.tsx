import { LogSheetProvider, LogButton } from '@/components/log-sheet'

// Placeholder nav; Task 12 builds the real one.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <LogSheetProvider>
      <div className="flex">
        <nav className="flex w-56 shrink-0 flex-col gap-6 p-6">
          <span className="font-display text-2xl">geeked-drunk</span>
          <LogButton />
        </nav>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </LogSheetProvider>
  )
}
