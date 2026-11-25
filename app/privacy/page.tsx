import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Privacy Policy · geeked-drunk' }

export default function Privacy() {
  return (
    <main className="mx-auto flex max-w-prose flex-col gap-4 px-6 py-12 text-body">
      <p className="font-note text-2xl text-note">your data, plainly</p>
      <h1 className="font-display text-4xl">Privacy Policy</h1>
      <p className="rounded-xl bg-raised px-4 py-3 text-text">Beta draft, not reviewed by a lawyer.</p>
      <p className="text-sm text-muted">Effective November 24, 2026.</p>
      <h2 className="mt-4 font-display text-2xl">What we collect</h2>
      <p>Your email, username, display name and birthdate (for the 21+ check). Also what you create: logs, reviews, friendships, crews, cheers and tags.</p>
      <h2 className="mt-4 font-display text-2xl">Why</h2>
      <p>To run your account, check your age, and show your activity to the people you choose.</p>
      <h2 className="mt-4 font-display text-2xl">Who processes it</h2>
      <ul className="list-disc pl-6">
        <li>Supabase: database and sign-in hosting.</li>
        <li>Netlify: web hosting.</li>
        <li>Photon by komoot: receives the text you type when searching for a spot.</li>
        <li>TMDB: movie data.</li>
      </ul>
      <h2 className="mt-4 font-display text-2xl">No selling</h2>
      <p>We do not sell your data.</p>
      <h2 className="mt-4 font-display text-2xl">Who sees your posts</h2>
      <p>Visibility settings control who can see your logs.</p>
      <h2 className="mt-4 font-display text-2xl">Deleting your data</h2>
      <p>Go to Settings, then Delete account, to remove your account and your data.</p>
      <h2 className="mt-4 font-display text-2xl">Contact</h2>
      <p>Questions: contact@REPLACE-ME.example</p>
    </main>
  )
}
