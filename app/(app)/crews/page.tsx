import Link from 'next/link'
import { getMyCrews } from '@/lib/queries/crews'
import { CreateCrewForm } from '@/components/crew-forms'
import { EmptyState } from '@/components/empty-state'

export default async function CrewsPage() {
  const crews = await getMyCrews()
  return (
    <main className="mx-auto max-w-3xl px-6 py-8 md:px-10">
      <h1 className="font-display text-4xl">Crews</h1>
      {crews.length === 0 ? (
        <div className="mt-6"><EmptyState title="No crews yet">Start one below and add your friends.</EmptyState></div>
      ) : (
        <ul className="mt-6">
          {crews.map((c) => (
            <li key={c.id} className="border-b border-line">
              <Link href={`/crews/${c.id}`} className="block py-4 text-lg">{c.name}</Link>
            </li>
          ))}
        </ul>
      )}
      <CreateCrewForm />
    </main>
  )
}
