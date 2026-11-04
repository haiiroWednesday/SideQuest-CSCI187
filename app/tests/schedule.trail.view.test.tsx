// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { ScheduleTrailView } from '../src/view/ScheduleTrailView'
import { presentSchedule, type ScheduleInput, type ScreenEvent } from '../src/controller/presentScreens'

afterEach(cleanup)

const e = (id: string, title: string, date: string, start: string, end: string): ScreenEvent =>
  ({ id, title, date, start, end, location: 'Library', hostName: 'SCU Club' })
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
  it('leads with Next up, counted from the clock, and marks overlaps on both plans', () => {
    render(draw(new Date('2030-11-07T13:00:00-08:00')))
    const next = screen.getByRole('complementary')
    expect(within(next).getByText('in 1 hr 30 min')).toBeTruthy()
    expect(within(next).getByRole('heading', { name: 'Ceramics Workshop' })).toBeTruthy()
    expect(screen.getByText('2 plans have conflicts')).toBeTruthy()
    expect(screen.getAllByText(/^Overlaps .* by 30 min$/)).toHaveLength(3) // two stubs and the Next up warning
    expect(screen.getByText('An event you planned')).toBeTruthy()
  })

  it('moves Next up and folds finished plans away as time passes', () => {
    render(draw(new Date('2030-11-07T16:30:00-08:00')))
    expect(within(screen.getByRole('complementary')).getByText('Tomorrow at 7:00pm')).toBeTruthy()
    expect(screen.getByText('Already happened · 2')).toBeTruthy()
    expect(screen.queryByText(/plans overlap/)).toBeNull()
  })

  it('reports the exact plan ID to remove, including an unavailable one', () => {
    const onRemove = vi.fn()
    render(draw(new Date('2030-11-07T13:00:00-08:00'), onRemove))
    fireEvent.click(screen.getByRole('button', { name: 'Remove unavailable event gone-7 from plans' }))
    expect(onRemove).toHaveBeenCalledWith('gone-7')
  })

  it('has an empty state that points back to Discover', () => {
    render(<ScheduleTrailView screen={presentSchedule({ ids: [], entries: [], missingIds: [] })} routes={{ discover: '/' }} />)
    expect(screen.getByText('Nothing planned yet.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Browse Discover →' }).getAttribute('href')).toBe('/')
  })
})


it('keeps retry and local removal available for a plan whose lookup failed', () => {
  const onRemove = vi.fn(), onRetry = vi.fn()
  render(<ScheduleTrailView screen={presentSchedule({ ids: ['unloaded'], entries: [], missingIds: [], unresolvedIds: ['unloaded'] })} onRemove={onRemove} onRetry={onRetry} />)
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
  expect(onRetry).toHaveBeenCalledOnce()
  fireEvent.click(screen.getByRole('button', { name: 'Remove unloaded event unloaded from plans' }))
  expect(onRemove).toHaveBeenCalledWith('unloaded')
  expect(screen.queryByText('An event you planned')).toBeNull()
})
