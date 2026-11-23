// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { layoutDayTimeline } from '../src/controller/scheduleTimeline'
import { ScheduleTimeline } from '../src/view/ScheduleTimeline'

afterEach(cleanup)

describe('Schedule duration-proportional visualization', () => {
  it('renders 30, 60 and 120-minute blocks with exact proportional heights', () => {
    const timeline = layoutDayTimeline([
      { id: 'a', title: 'Art', start: '09:00', end: '09:30' },
      { id: 'b', title: 'Music', start: '10:00', end: '11:00' },
      { id: 'c', title: 'Lecture', start: '12:00', end: '14:00' },
    ])!
    const { container } = render(<ScheduleTimeline timeline={timeline} />)
    const height = (id: string) =>
      (container.querySelector('.sq-timeline-block[data-event-id="' + id + '"]') as HTMLElement).style.height
    expect(height('a')).toBe('36px')
    expect(height('b')).toBe('72px')
    expect(height('c')).toBe('144px')
    expect(container.querySelector('.sq-timeline-grid')?.getAttribute('aria-hidden')).toBe('true')
    expect(container.textContent).toContain('Full details and removal controls follow below.')
  })

  it('preserves lane widths and top offsets for overlapping events', () => {
    const timeline = layoutDayTimeline([
      { id: 'a', title: 'Art', start: '14:30', end: '15:30' },
      { id: 'b', title: 'Music', start: '15:00', end: '16:00' },
    ])!
    const { container } = render(<ScheduleTimeline timeline={timeline} />)
    const a = container.querySelector('.sq-timeline-block[data-event-id="a"]') as HTMLElement
    const b = container.querySelector('.sq-timeline-block[data-event-id="b"]') as HTMLElement
    expect(a.style.top).toBe('36px')
    expect(b.style.top).toBe('72px')
    expect(a.style.width).toBe('50%')
    expect(b.style.left).toBe('50%')
  })
})
