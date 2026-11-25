// @vitest-environment jsdom
// The day bar: a Busy/Free switch, and drags that land on five-minute steps at both edges.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { CELL, CELLS, presentMarks, type MarkMode } from '../src/controller/freeMarks'
import { FreeMarker } from '../src/view/FreeMarker'

afterEach(() => cleanup())
// jsdom has no PointerEvent; a MouseEvent carries clientX the same way.
if (!('PointerEvent' in window)) (window as unknown as { PointerEvent: typeof MouseEvent }).PointerEvent = class extends MouseEvent {
  pointerId: number
  constructor(type: string, init: PointerEventInit = {}) { super(type, init); this.pointerId = init.pointerId ?? 1 }
}
const NOW = new Date('2026-11-24T18:40:00Z') // 10:40 in Santa Clara
const cell = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return (h * 60 + m - 480) / CELL }
function setup(mode: MarkMode = 'busy') {
  const onReshape = vi.fn(), onMode = vi.fn()
  const model = presentMarks({ events: [], plannedIds: [], now: NOW, marks: {}, open: {}, mode })
  render(<FreeMarker model={model} fitText={null} onDate={() => {}} onWhen={() => {}} onAddBusy={() => true} onFillGap={() => {}}
    onUnbusy={() => {}} onReshape={onReshape} onClear={null} onMode={onMode} />)
  const bar = document.querySelector('.sq-mbar') as HTMLElement
  // 900px wide from x=0: each five-minute step is 5px.
  bar.getBoundingClientRect = () => ({ left: 0, width: CELLS * 5, top: 0, height: 60, right: CELLS * 5, bottom: 60, x: 0, y: 0, toJSON: () => ({}) })
  bar.setPointerCapture = () => {}
  return { bar, onReshape, onMode }
}

describe('the Busy/Free switch', () => {
  it('is one plain toggle on the bar, Busy first', () => {
    const { onMode } = setup()
    const group = screen.getByRole('group', { name: 'What you mark on the bar' })
    expect([...group.querySelectorAll('button')].map(b => `${b.textContent}${b.getAttribute('aria-pressed') === 'true' ? '*' : ''}`)).toEqual(['Busy*', 'Free'])
    fireEvent.click(screen.getByRole('button', { name: 'Free' }))
    expect(onMode).toHaveBeenCalledWith('free')
  })
  it('Free mode names the form and the key for free time', () => {
    setup('free')
    expect(screen.getByRole('form', { name: /Add free time/ })).toBeTruthy()
    expect(document.querySelector('.sq-mbar-key')?.textContent).toContain('free, drag to add')
  })
})

describe('dragging on the bar', () => {
  it('snaps both edges to five-minute steps: 1:12 to 1:53 becomes 1:10 to 1:55', () => {
    const { bar, onReshape } = setup('free')
    const x = (hhmm: string, into: number) => cell(hhmm) * 5 + into
    fireEvent.pointerDown(bar, { button: 0, clientX: x('13:10', 2), pointerId: 1 })
    fireEvent.pointerMove(bar, { clientX: x('13:50', 3), pointerId: 1 })
    fireEvent.pointerUp(bar, { clientX: x('13:50', 3), pointerId: 1 })
    expect(onReshape).toHaveBeenCalledWith(null, cell('13:10'), cell('13:50'))
  })
  it('a tap with no drag marks one hour', () => {
    const { bar, onReshape } = setup()
    fireEvent.pointerDown(bar, { button: 0, clientX: cell('15:00') * 5 + 1, pointerId: 1 })
    fireEvent.pointerUp(bar, { clientX: cell('15:00') * 5 + 1, pointerId: 1 })
    expect(onReshape).toHaveBeenCalledWith(null, cell('15:00'), cell('16:00') - 1)
  })
})
