'use client'
import { useState, useTransition } from 'react'
import { declineTag } from '@/actions/tags'
import { useLogSheet } from '@/components/log-sheet'
import type { TagItem } from '@/lib/queries/tags'

export function TagsInbox({ tags }: { tags: TagItem[] }) {
  return (
    <ul className="mt-4 divide-y divide-line">
      {tags.map((t) => <TagRow key={t.sessionId} tag={t} />)}
    </ul>
  )
}

function TagRow({ tag }: { tag: TagItem }) {
  const [pending, start] = useTransition()
  const [error, setError] = useState('')
  const { open } = useLogSheet()
  const title = tag.movie.title
  return (
    <li className="flex gap-4 py-4">
      <span className="block aspect-[2/3] w-[72px] shrink-0 overflow-hidden rounded-poster bg-raised">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {tag.poster && <img src={tag.poster} alt="" className="size-full object-cover" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-note text-2xl text-note">{tag.taggerUsername} tagged you on {title} · {tag.watchedOn}</p>
        <div className="mt-2 flex gap-4 text-sm">
          <button
            type="button"
            aria-label={`Approve tag from ${tag.taggerUsername} on ${title}`}
            onClick={() => open(tag.movie, {
              watchedOn: tag.watchedOn, fromTagSessionId: tag.sessionId,
              companionIds: tag.taggerIsFriend ? [tag.taggerId] : [],
            })}
            className="font-semibold text-accent"
          >
            Approve
          </button>
          <button
            type="button" disabled={pending}
            aria-label={`Decline tag from ${tag.taggerUsername} on ${title}`}
            onClick={() => start(async () => { const r = await declineTag(tag.sessionId); setError(r.ok ? '' : r.error) })}
            className="text-muted disabled:opacity-40"
          >
            Decline
          </button>
        </div>
        {error && <p role="alert" className="mt-1 text-sm text-drunk">{error}</p>}
      </div>
    </li>
  )
}
