import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { InfluenceChip } from '@/components/influence-chip'
import { RecommendToggle } from '@/components/recommend-toggle'

describe('influence components', () => {
  it('chip shows label and aria-pressed', () => {
    render(<InfluenceChip influence="high" selected />)
    const b = screen.getByRole('button', { name: /High/ })
    expect(b.getAttribute('aria-pressed')).toBe('true')
  })
  it('toggle renders null for sober', () => {
    const { container } = render(<RecommendToggle influence="sober" value={null} onChange={() => {}} />)
    expect(container.firstChild).toBeNull()
  })
  it('toggle pills: unset, pressed, click', () => {
    const fn = vi.fn()
    render(<RecommendToggle influence="both" value={null} onChange={fn} />)
    const yes = screen.getByRole('button', { name: 'Yes, recommend it drunk and high' })
    const no = screen.getByRole('button', { name: 'Nah, skip it drunk and high' })
    expect(yes.getAttribute('aria-pressed')).toBe('false')
    expect(no.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(no)
    expect(fn).toHaveBeenCalledWith(false)
  })
  it('toggle shows pressed state', () => {
    render(<RecommendToggle influence="high" value={true} onChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Yes, recommend it high' }).getAttribute('aria-pressed')).toBe('true')
  })
})

vi.mock('server-only', () => ({}))
vi.mock('@/actions/cheers', () => ({ toggleCheers: vi.fn() }))
vi.mock('@/actions/sessions', () => ({ deleteSession: vi.fn() }))

describe('SessionCard subjects', () => {
  const base = {
    id: 's1', profile: { id: 'u1', username: 'sam', displayName: null, avatarUrl: null }, influence: 'drunk' as const,
    recommend: null, review: null, watchedOn: '2026-11-01', cheers: 0, cheeredByMe: false,
    createdAt: new Date().toISOString(), cursor: '', withNames: [],
  }
  it('place: name heading, /place link, no img', async () => {
    const { SessionCard } = await import('@/components/session-card')
    const { container } = render(<SessionCard item={{ ...base, subject: { kind: 'place', place: { id: 'p1', name: 'Taco Bell', category: 'fast_food' } } }} />)
    expect(screen.getByRole('heading', { name: 'Taco Bell' })).toBeTruthy()
    expect(container.querySelector('a[href="/place/p1"]')).toBeTruthy()
    expect(container.querySelector('img')).toBeNull()
  })
  it('movie: links to /movie/1', async () => {
    const { SessionCard } = await import('@/components/session-card')
    const { container } = render(<SessionCard item={{ ...base, subject: { kind: 'movie', movie: { tmdbId: 1, title: 'Heat', year: 1995, posterPath: null } } }} />)
    expect(container.querySelector('a[href="/movie/1"]')).toBeTruthy()
  })
})

vi.mock('@/actions/tags', () => ({ declineTag: vi.fn() }))
vi.mock('@/components/log-sheet', () => ({ useLogSheet: () => ({ open: vi.fn() }) }))
describe('TagsInbox place tag', () => {
  it('renders without crashing and Approve is enabled', async () => {
    const { TagsInbox } = await import('@/components/tags-inbox')
    render(<TagsInbox tags={[{
      sessionId: 't1', subject: { kind: 'place', place: { id: 'p1', name: 'Taco Bell', category: null } }, poster: null,
      watchedOn: '2026-11-01', taggerId: 'u2', taggerUsername: 'kim', taggerName: 'kim', taggerIsFriend: true,
    }]} />)
    expect((screen.getByRole('button', { name: /Approve tag from kim/ }) as HTMLButtonElement).disabled).toBe(false)
  })
})
