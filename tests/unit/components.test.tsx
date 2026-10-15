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
