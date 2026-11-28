import { describe, expect, it } from 'vitest'
import { presentSchedule, withPreview } from '../src/controller/presentSchedule'
import type { ScreenEvent } from '../src/controller/screenModels'

const NOW = new Date('2026-11-24T18:40:00Z')
const ev = (id: string, start: string, end: string, date = '2026-11-25') =>
  ({ id, date, start, end, title: id, host: 'Host', location: 'Library', description: '' }) as unknown as ScreenEvent
const lab = ev('lab', '13:00', '15:00')
const base = { ids: ['lab'], entries: [{ event: lab, conflict: null }], missingIds: [] }

describe('My day preview', () => {
  it('adds an unplanned event to its day, marked as a preview and never counted as a plan', () => {
    const screen = presentSchedule(withPreview(base, ev('talk', '17:00', '18:00')), NOW)
    expect(screen.plannedCount).toBe(1)
    const stubs = screen.days.flatMap(d => d.events)
    expect(stubs.find(s => s.id === 'talk')?.preview).toBe(true)
    expect(stubs.find(s => s.id === 'talk')?.planned).toBe(false)
    expect(stubs.find(s => s.id === 'lab')?.preview).toBeUndefined()
  })
  it('shows a clash with a plan it overlaps', () => {
    const screen = presentSchedule(withPreview(base, ev('talk', '14:00', '16:00')), NOW)
    expect(screen.days.flatMap(d => d.events).find(s => s.id === 'talk')?.overlap?.title).toBe('lab')
  })
  it('never becomes Next up, and an already planned event is left alone', () => {
    const screen = presentSchedule(withPreview(base, ev('early', '09:00', '10:00')), NOW)
    expect(screen.nextUp?.stub.id).toBe('lab')
    expect(withPreview(base, lab)).toBe(base)
    expect(withPreview(base, null)).toBe(base)
  })
  it('with nothing planned, the day still shows the preview', () => {
    const screen = presentSchedule(withPreview({ ids: [], entries: [], missingIds: [] }, ev('talk', '17:00', '18:00')), NOW)
    expect(screen.status).toBe('ready')
    expect(screen.days).toHaveLength(1)
  })
})
