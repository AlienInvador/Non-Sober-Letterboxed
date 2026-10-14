import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { InfluenceChip } from '@/components/influence-chip'
import { NeonStars } from '@/components/neon-stars'
import { RecommendToggle } from '@/components/recommend-toggle'

describe('influence components', () => {
  it('chip shows label and aria-pressed', () => {
    render(<InfluenceChip influence="high" selected />)
    const b = screen.getByRole('button', { name: /High/ })
    expect(b.getAttribute('aria-pressed')).toBe('true')
  })
  it('stars ArrowRight 3 -> 3.5', () => {
    const fn = vi.fn()
    render(<NeonStars value={3} onChange={fn} influence="drunk" />)
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Rating' }), { key: 'ArrowRight' })
    expect(fn).toHaveBeenCalledWith(3.5)
  })
  it('stars ArrowRight from null -> 0.5', () => {
    const fn = vi.fn()
    render(<NeonStars value={null} onChange={fn} influence="drunk" />)
    fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' })
    expect(fn).toHaveBeenCalledWith(0.5)
  })
  it('toggle renders null for sober', () => {
    const { container } = render(<RecommendToggle influence="sober" value={null} onChange={() => {}} />)
    expect(container.firstChild).toBeNull()
  })
  it('toggle both label', () => {
    render(<RecommendToggle influence="both" value={true} onChange={() => {}} />)
    const s = screen.getByRole('switch', { name: 'Recommend it drunk and high?' })
    expect(s.getAttribute('aria-checked')).toBe('true')
    expect(screen.getByText('Recommend it drunk and high?')).toBeTruthy()
  })
})

describe('stars clicks', () => {
  it('click current value star -> n-0.5', () => {
    const fn = vi.fn()
    render(<NeonStars value={3} onChange={fn} influence="high" />)
    fireEvent.click(screen.getByTestId('star-3'))
    expect(fn).toHaveBeenCalledWith(2.5)
  })
})
