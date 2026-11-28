// @vitest-environment jsdom
// The week of busy time (Nov 27, D7): a Busy/Free switch, and drags on the open day that land on
// five-minute steps at both edges. Drags run top to bottom now; the old one-day bar ran left to right.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { CELL, CELLS, presentMarks, type MarkMode, NIGHT_CELLS } from '../src/controller/freeMarks'
import { FreeMarker } from '../src/view/FreeMarker'

afterEach(() => cleanup())
// jsdom has no PointerEvent; a MouseEvent carries clientX the same way.
if (!('PointerEvent' in window)) (window as unknown as { PointerEvent: typeof MouseEvent }).PointerEvent = class extends MouseEvent {
  pointerId: number
  constructor(type: string, init: PointerEventInit = {}) { super(type, init); this.pointerId = init.pointerId ?? 1 }
}
const NOW = new Date('2026-11-24T18:40:00Z') // 10:40 in Santa Clara
const cell = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return (h * 60 + m) / CELL }
// The week shows 7am to midnight until the night is opened, so a row on screen is counted from 7am.
const row = (hhmm: string) => cell(hhmm) - NIGHT_CELLS
function setup(mode: MarkMode = 'busy') {
  const onReshape = vi.fn(), onMode = vi.fn()
  const model = presentMarks({ events: [], plannedIds: [], now: NOW, marks: {}, open: {}, mode })
  render(<FreeMarker model={model} fitText={null} onDate={() => {}} onWhen={() => {}} onAddBusy={() => true}
    onUnbusy={() => {}} onReshape={onReshape} onClear={null} onMode={onMode} />)
  const bar = document.querySelector('.sq-wk-open') as HTMLElement
  // The open day starts at y=0 and each five-minute step is 5px.
  bar.getBoundingClientRect = () => ({ top: 0, height: (CELLS - NIGHT_CELLS) * 5, left: 0, width: 120, bottom: (CELLS - NIGHT_CELLS) * 5, right: 120, x: 0, y: 0, toJSON: () => ({}) })
  bar.setPointerCapture = () => {}
  return { bar, onReshape, onMode }
}

describe('the Busy/Free switch', () => {
  it('is one plain toggle above the week, Busy first', () => {
    const { onMode } = setup()
    const group = screen.getByRole('group', { name: 'What you mark on the week' })
    expect([...group.querySelectorAll('button')].map(b => `${b.textContent}${b.getAttribute('aria-pressed') === 'true' ? '*' : ''}`)).toEqual(['Busy*', 'Free'])
    fireEvent.click(screen.getByRole('button', { name: 'Free' }))
    expect(onMode).toHaveBeenCalledWith('free')
  })
  it('Free mode names the form and the key for free time', () => {
    setup('free')
    // Typing times sits behind one line, so the week is what you see first.
    expect(screen.queryByRole('form', { name: /Add free time/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Type free times/ }))
    expect(screen.getByRole('form', { name: /Add free time/ })).toBeTruthy()
    expect(document.querySelector('.sq-mbar-key')?.textContent).toContain('free, drag to add')
  })
})

describe('dragging on the open day', () => {
  it('snaps both edges to five-minute steps: 1:12 to 1:53 becomes 1:10 to 1:55', () => {
    const { bar, onReshape } = setup('free')
    const x = (hhmm: string, into: number) => row(hhmm) * 5 + into
    fireEvent.pointerDown(bar, { button: 0, clientY: x('13:10', 2), pointerId: 1 })
    fireEvent.pointerMove(bar, { clientY: x('13:50', 3), pointerId: 1 })
    fireEvent.pointerUp(bar, { clientY: x('13:50', 3), pointerId: 1 })
    expect(onReshape).toHaveBeenCalledWith(null, cell('13:10'), cell('13:50'))
  })
  it('a tap with no drag marks one hour', () => {
    const { bar, onReshape } = setup()
    fireEvent.pointerDown(bar, { button: 0, clientY: row('15:00') * 5 + 1, pointerId: 1 })
    fireEvent.pointerUp(bar, { clientY: row('15:00') * 5 + 1, pointerId: 1 })
    expect(onReshape).toHaveBeenCalledWith(null, cell('15:00'), cell('16:00') - 1)
  })
})

describe('the week', () => {
  const day = '2026-11-24'
  const render2 = (marks: Record<string, number[]>, calendar: Record<string, number[]> = {}, onDate = vi.fn(), onReshape = vi.fn()) => {
    const model = presentMarks({ events: [], plannedIds: [], now: NOW, marks, open: {}, mode: 'busy', calendar })
    render(<FreeMarker model={model} fitText={null} onDate={onDate} onWhen={() => {}} onAddBusy={() => true}
      onUnbusy={() => {}} onReshape={onReshape} onClear={null} onMode={() => {}} />)
    const bar = document.querySelector('.sq-wk-open') as HTMLElement
    bar.getBoundingClientRect = () => ({ top: 0, height: (CELLS - NIGHT_CELLS) * 5, left: 0, width: 120, bottom: (CELLS - NIGHT_CELLS) * 5, right: 120, x: 0, y: 0, toJSON: () => ({}) })
    bar.setPointerCapture = () => {}
    return { bar, onDate, onReshape }
  }
  const range = (from: string, to: string) => Array.from({ length: cell(to) - cell(from) }, (_, i) => cell(from) + i)
  it('shows seven days, the open one editable, and opens another day with a tap', () => {
    const { onDate } = render2({})
    expect(document.querySelectorAll('.sq-wk-col')).toHaveLength(7)
    expect(document.querySelectorAll('.sq-wk-open')).toHaveLength(1)
    fireEvent.click(document.querySelectorAll('.sq-wk-col')[2])
    expect(onDate).toHaveBeenCalledWith('2026-11-26')
  })
  it('draws your busy time in stone and Google Calendar time in Google blue', () => {
    const busy = [...range('12:00', '13:00'), ...range('15:00', '16:00')]
    render2({ [day]: busy }, { [day]: range('12:00', '13:00') })
    expect(document.querySelectorAll('.sq-wk-open .sq-wk-google')).toHaveLength(1)
    expect(document.querySelectorAll('.sq-wk-open .sq-wk-busy')).toHaveLength(2)
  })
  it('moves a busy window by dragging its middle, and stretches it by its bottom edge', () => {
    const { bar, onReshape } = render2({ [day]: range('15:00', '16:00') })
    const y = (hhmm: string) => row(hhmm) * 5 + 2
    fireEvent.pointerDown(bar, { button: 0, clientY: y('15:30'), pointerId: 1 })
    fireEvent.pointerMove(bar, { clientY: y('16:30'), pointerId: 1 })
    fireEvent.pointerUp(bar, { clientY: y('16:30'), pointerId: 1 })
    expect(onReshape).toHaveBeenLastCalledWith({ first: cell('15:00'), last: cell('16:00') - 1 }, cell('16:00'), cell('17:00') - 1)
    cleanup()
    const second = render2({ [day]: range('15:00', '16:00') })
    fireEvent.pointerDown(second.bar, { button: 0, clientY: row('16:00') * 5 - 2, pointerId: 1 })
    fireEvent.pointerMove(second.bar, { clientY: y('17:00'), pointerId: 1 })
    fireEvent.pointerUp(second.bar, { clientY: y('17:00'), pointerId: 1 })
    expect(second.onReshape).toHaveBeenLastCalledWith({ first: cell('15:00'), last: cell('16:00') - 1 }, cell('15:00'), cell('17:00'))
  })
  it('keeps the grid out of the screen reader; the typed list does the same jobs', () => {
    render2({ [day]: range('15:00', '16:00') })
    expect(document.querySelector('.sq-week-grid')?.getAttribute('aria-hidden')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: /Edit busy times/ }))
    expect(screen.getByRole('list', { name: /Your busy times/ })).toBeTruthy()
  })
})
