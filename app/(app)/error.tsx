'use client'

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center gap-4 px-6 py-12">
      <p className="font-note text-2xl text-note">well, that flopped</p>
      <h1 className="font-display text-3xl">Something went wrong</h1>
      <p className="text-muted">Give it another go. If it keeps happening, try again in a bit.</p>
      <div>
        <button type="button" onClick={() => reset()} className="rounded-full bg-accent-fill px-6 py-3 font-semibold text-white">
          Try again
        </button>
      </div>
    </main>
  )
}
