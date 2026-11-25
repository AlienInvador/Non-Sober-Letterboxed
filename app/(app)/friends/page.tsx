import { getFriendsData } from '@/actions/friends'
import { FriendsClient } from '@/components/friends-client'

export default async function FriendsPage() {
  const data = await getFriendsData()
  if (!data) return <main className="mx-auto max-w-3xl px-6 py-8 md:px-10"><p className="text-muted">Sign in to see your friends.</p></main>
  return (
    <main className="mx-auto max-w-3xl px-6 py-8 md:px-10">
      <h1 className="font-display text-4xl">Friends</h1>
      <FriendsClient {...data} />
    </main>
  )
}
