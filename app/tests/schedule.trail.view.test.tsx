// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { ScheduleTrailView } from '../src/view/ScheduleTrailView'
import { presentSchedule, type ScheduleInput, type ScreenEvent } from '../src/controller/presentScreens'
import { createScheduleController } from '../src/controller/personalSchedule'
import { campusAt } from './helpers/campusTime'

afterEach(cleanup)

const e = (id: string, title: string, date: string, start: string, end: string): ScreenEvent =>
  ({ id, title, date, start, end, location: 'Library', hostName: 'SCU Club', description: 'Details.' })
const ceramics = e('ceramics', 'Ceramics Workshop', '2030-11-07', '14:30', '15:30')
const poetry = e('poetry', 'Poetry Reading', '2030-11-07', '15:00', '16:00')
const mic = e('mic', 'Open Mic Night', '2030-11-08', '19:00', '21:00')
// Same shape the Schedule controller returns: entries with one representative conflict, and IDs it could not find.
const input: ScheduleInput = {
  ids: ['ceramics', 'poetry', 'mic', 'gone-7'],
  entries: [{ event: ceramics, conflict: poetry }, { event: poetry, conflict: ceramics }, { event: mic, conflict: null }],
  missingIds: ['gone-7'],
}
const draw = (now: Date, onRemove = vi.fn()) =>
  <ScheduleTrailView screen={presentSchedule(input, now)} onRemove={onRemove} routes={{ discover: '/', schedule: '/schedule' }} />

describe('My Schedule trail view: draws the Controller screen', () => {
  it('leads with Next up, counted from the campus clock; stubs only say Overlaps, the details name the clash', () => {
    render(draw(campusAt('2030-11-07', '13:00')))
    const next = screen.getByRole('complementary')
    expect(within(next).getByText('in 1 hr 30 min')).toBeTruthy()
    expect(within(next).getByRole('heading', { name: 'Ceramics Workshop' })).toBeTruthy()
    expect(screen.getByText('2 plans overlap')).toBeTruthy()
    expect(screen.getAllByText('Overlaps')).toHaveLength(2)
    expect(within(next).getByText('Overlaps 1 plan')).toBeTruthy()
    expect(within(next).getByText('Poetry Reading')).toBeTruthy()
    expect(screen.getByText('An event you planned')).toBeTruthy()
    expect(screen.getByText('in a time conflict')).toBeTruthy()
  })

  it('opens any plan in the details when tapped, then returns to Next up', () => {
    render(draw(campusAt('2030-11-07', '13:00')))
    fireEvent.click(screen.getByRole('button', { name: 'View details for Poetry Reading' }))
    const card = screen.getByRole('complementary')
    expect(within(card).getByRole('heading', { name: 'Poetry Reading' })).toBeTruthy()
    expect(within(card).getByText('YOUR PLAN')).toBeTruthy()
    expect(within(card).getByText('Ceramics Workshop')).toBeTruthy()
    fireEvent.click(within(card).getByRole('button', { name: 'Back to Next up' }))
    expect(within(screen.getByRole('complementary')).getByRole('heading', { name: 'Ceramics Workshop' })).toBeTruthy()
  })

  it('moves Next up and folds finished plans away as time passes', () => {
    render(draw(campusAt('2030-11-07', '16:30')))
    expect(within(screen.getByRole('complementary')).getByText('Tomorrow at 7:00pm')).toBeTruthy()
    expect(screen.getByText('Already happened · 2')).toBeTruthy()
    expect(screen.queryByText(/plans overlap/)).toBeNull()
  })

  it('reports the exact plan ID to remove, including an unavailable one', () => {
    const onRemove = vi.fn()
    render(draw(campusAt('2030-11-07', '13:00'), onRemove))
    fireEvent.click(screen.getByRole('button', { name: 'Remove unavailable event from plans' }))
    expect(onRemove).toHaveBeenCalledWith('gone-7')
    expect(screen.getByText('It may have ended or been taken down.')).toBeTruthy()
  })

  it('has an empty state that points back to Discover', () => {
    render(<ScheduleTrailView screen={presentSchedule({ ids: [], entries: [], missingIds: [] })} routes={{ discover: '/' }} />)
    expect(screen.getByText('Nothing planned yet.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Browse Discover →' }).getAttribute('href')).toBe('/')
  })

  it('offers recovery for unreadable plans and shows the limit notice, as the Schedule controller words them', () => {
    const onRecover = vi.fn()
    const { rerender } = render(<ScheduleTrailView screen={presentSchedule({ ids: [], entries: [], missingIds: [], blocked: true })}
      onRecover={onRecover} error="Some saved plans could not be read. They have not been overwritten." />)
    expect(screen.getByRole('alert').textContent).toContain('could not be read')
    fireEvent.click(screen.getByRole('button', { name: 'Recover valid plans' }))
    expect(onRecover).toHaveBeenCalledOnce()

    rerender(<ScheduleTrailView screen={presentSchedule({ ...input, capacityMessage: 'Your schedule has reached the 100-event limit.' }, campusAt('2030-11-07', '13:00'))} />)
    expect(screen.getByText('Your schedule has reached the 100-event limit.')).toBeTruthy()
  })

  it('never calls plans unavailable while the catalog is still loading or has failed', () => {
    const onRetry = vi.fn()
    const waiting: ScheduleInput = { ids: ['x'], entries: [], missingIds: ['x'] }
    const { rerender } = render(<ScheduleTrailView screen={presentSchedule(waiting, new Date(), { loading: true })} />)
    expect(screen.getByRole('status').textContent).toContain('Looking up your planned events')
    expect(screen.queryByText('An event you planned')).toBeNull()
    rerender(<ScheduleTrailView screen={presentSchedule(waiting, new Date(), { error: 'Could not reach the event list.' })} onRetry={onRetry} />)
    expect(screen.getByRole('heading', { name: 'Your plans are safe, but their details could not be loaded.' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('works with the real Schedule controller: add, conflict, remove, through the presenter', () => {
    const memory = new Map<string, string>()
    const storage = { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => void memory.set(k, v) }
    const plans = createScheduleController([ceramics, poetry, mic], () => storage)
    plans.add('ceramics')
    const result = plans.add('poetry')
    expect(result.warning).toContain('overlaps')
    const { rerender } = render(<ScheduleTrailView screen={presentSchedule(result.schedule, campusAt('2030-11-07', '13:00'))} warning={result.warning} />)
    expect(screen.getAllByText('Overlaps')).toHaveLength(2)
    const after = plans.remove('ceramics')
    rerender(<ScheduleTrailView screen={presentSchedule(after.schedule, campusAt('2030-11-07', '13:00'))} message={after.message} />)
    expect(screen.queryByText('Overlaps')).toBeNull()
    expect(screen.getByText('Removed from your plans. The original event has not been deleted.')).toBeTruthy()
  })
})
