import { InfluenceDot } from '@/components/influence-chip'
import { influenceLabel } from '@/lib/influence'
import type { FriendWatch } from '@/lib/queries/movie'

export function AvatarStack({ friends }: { friends: FriendWatch[] }) {
  return (
    <ul className="flex flex-wrap gap-x-8 gap-y-4">
      {friends.map(({ profile, influence, rating }) => (
        <li key={profile.id} className="flex items-center gap-3">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatarUrl} alt="" className="size-9 rounded-full object-cover" />
          ) : (
            <span aria-hidden className="flex size-9 items-center justify-center rounded-full bg-raised text-sm uppercase text-muted">
              {profile.username[0]}
            </span>
          )}
          <span className="text-sm">
            <span className="block text-text">{profile.username}</span>
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <InfluenceDot influence={influence} />
              {influenceLabel(influence)}
              {rating !== null && <span className="font-mono">· {rating}</span>}
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}
