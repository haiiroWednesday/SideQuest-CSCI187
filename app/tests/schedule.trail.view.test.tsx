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

  it('reveals complete legacy text in upcoming cards and Next up without losing removal', () => {
    const title = 'T'.repeat(120)
    const location = 'L'.repeat(200)
    const description = 'D'.repeat(2000)
    const event = { ...ceramics, title, location, description }
    const onRemove = vi.fn()
    const current = presentSchedule({
      ids: [event.id], entries: [{ event, conflict: null }], missingIds: [],
    }, new Date('2030-11-07T13:00:00-08:00'))

    render(<ScheduleTrailView screen={current} onRemove={onRemove} />)

    const trailDetails = document.querySelector<HTMLDetailsElement>('.sq-trail .sq-plan-details')
    const nextDetails = document.querySelector<HTMLDetailsElement>('.sq-sticker .sq-plan-details')
    expect(trailDetails).not.toBeNull()
    expect(nextDetails).not.toBeNull()
    expect(trailDetails?.open).toBe(false)

    const summary = within(trailDetails!).getByText('View full details')
    expect(summary.getAttribute('aria-label')).toBe(`View full details for ${title}`)
    fireEvent.click(summary)
    expect(trailDetails?.open).toBe(true)
    expect(within(trailDetails!).getByText(title)).toBeTruthy()
    expect(within(trailDetails!).getByText(location)).toBeTruthy()
    expect(within(trailDetails!).getByText(description)).toBeTruthy()

    fireEvent.click(within(nextDetails!).getByText('View full details'))
    expect(nextDetails?.open).toBe(true)
    expect(within(nextDetails!).getByText(location)).toBeTruthy()

    fireEvent.click(screen.getAllByRole('button', { name: `Remove ${title} from plans` })[0])
    expect(onRemove).toHaveBeenCalledWith(event.id)
  })

  it('provides full text for past planned events inside the existing disclosure', () => {
    const event = { ...ceramics, date: '2030-11-06', location: 'Past venue ' + 'L'.repeat(190) }
    const current = presentSchedule({
      ids: [event.id], entries: [{ event, conflict: null }], missingIds: [],
    }, new Date('2030-11-07T13:00:00-08:00'))

    render(<ScheduleTrailView screen={current} />)
    const pastSection = document.querySelector<HTMLDetailsElement>('.sq-done')
    expect(pastSection).not.toBeNull()
    fireEvent.click(within(pastSection!).getByText('Already happened · 1'))

    const details = pastSection!.querySelector<HTMLDetailsElement>('.sq-plan-details')
    expect(details).not.toBeNull()
    fireEvent.click(within(details!).getByText('View full details'))
    expect(details?.open).toBe(true)
    expect(within(details!).getByText(event.location)).toBeTruthy()
    expect(within(details!).getByText('No description was provided.')).toBeTruthy()
  })

  it.each([
    ['Ceramics Workshop', null],
    ['x'.repeat(41), 'sq-title-long'],
    ['x'.repeat(81), 'sq-title-xlong'],
  ])('sizes the Next up title like the details card (%#)', (title, expected) => {
    const long = { ...ceramics, title }
    render(<ScheduleTrailView screen={presentSchedule({ ids: ['ceramics'], entries: [{ event: long, conflict: null }], missingIds: [] }, new Date('2030-11-07T13:00:00-08:00'))} />)
    expect(within(screen.getByRole('complementary')).getByRole('heading', { name: title }).getAttribute('class')).toBe(expected)
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
