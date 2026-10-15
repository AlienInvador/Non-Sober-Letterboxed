import { getQueue } from '@/lib/queries/lists'
import { QueueRow } from '@/components/queue-row'

export default async function QueuePage() {
  const queue = await getQueue()
  return (
    <main className="mx-auto max-w-3xl px-6 py-8 md:px-10">
      <h1 className="font-display text-4xl">Your queue</h1>
      {queue.length === 0 ? (
        <p className="mt-4 text-muted">Nothing queued. Add movies from their page.</p>
      ) : (
        <ul className="mt-6 divide-y divide-line">{queue.map((m) => <QueueRow key={m.tmdbId} movie={m} />)}</ul>
      )}
    </main>
  )
}
