import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center gap-4 px-6 py-12">
      <p className="font-note text-2xl text-note">lost the plot</p>
      <h1 className="font-display text-4xl">Nothing here</h1>
      <p className="text-muted">That page does not exist, or it moved.</p>
      <div>
        <Link href="/" className="inline-block rounded-full bg-accent-fill px-6 py-3 font-semibold text-white">Back to Tonight</Link>
      </div>
    </main>
  )
}
