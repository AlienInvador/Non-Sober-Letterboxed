import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Terms of Service · geeked-drunk' }

export default function Terms() {
  return (
    <main className="mx-auto flex max-w-prose flex-col gap-4 px-6 py-12 text-body">
      <p className="font-note text-2xl text-note">the fine print</p>
      <h1 className="font-display text-4xl">Terms of Service</h1>
      <p className="rounded-xl bg-raised px-4 py-3 text-text">Beta draft, not reviewed by a lawyer.</p>
      <p className="text-sm text-muted">Effective November 24, 2026.</p>
      <h2 className="mt-4 font-display text-2xl">Who can use it</h2>
      <p>geeked-drunk is for people 21 and older. If you are under 21, do not use it.</p>
      <h2 className="mt-4 font-display text-2xl">Your content</h2>
      <p>You own what you post: logs, reviews and notes. You give us a license to store and show it in the app, to the people your visibility settings allow.</p>
      <h2 className="mt-4 font-display text-2xl">What is not allowed</h2>
      <p>No content that promotes drunk driving, illegal sales or harassment.</p>
      <h2 className="mt-4 font-display text-2xl">Local law</h2>
      <p>Cannabis laws vary by place. You are responsible for following the law where you are.</p>
      <h2 className="mt-4 font-display text-2xl">No advice</h2>
      <p>We do not give medical or safety advice. Nothing here tells you what is safe for you.</p>
      <h2 className="mt-4 font-display text-2xl">Removal</h2>
      <p>We can remove content and accounts that break these terms.</p>
      <h2 className="mt-4 font-display text-2xl">Beta, as is</h2>
      <p>This is a closed beta. It is provided as is, with no promises that it will work or stay available.</p>
      <h2 className="mt-4 font-display text-2xl">Deleting your account</h2>
      <p>You can delete your account any time in Settings, then Delete account.</p>
      <h2 className="mt-4 font-display text-2xl">Contact</h2>
      <p>Questions: contact@REPLACE-ME.example</p>
    </main>
  )
}
