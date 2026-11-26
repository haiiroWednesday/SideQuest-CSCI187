// @vitest-environment jsdom
// How to attend, as drawn: the two-choice control on Post, "Drop in" on a ticket where a set-time
// ticket shows its length, the opened card's one line, and the drop-in fit mark.
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmbeddedPostEventForm } from '../src/view/PostEventForm'
import { DiscoverView, EventStub, type DiscoverEvent } from '../src/view/DiscoverView'
import { EventDetailContent } from '../src/view/EventDetailContent'
import { FitMark } from '../src/view/FitMark'
import { QuietContext } from '../src/view/quietContext'
import { presentDiscover } from '../src/controller/presentScreens'
import { presentFitMark } from '../src/controller/presentFitMark'
import { toStub } from '../src/controller/screenModels'
import { createEventCatalog, type EventRow } from '../src/model/eventCatalog'
import { createInMemoryEventTable } from '../src/model/inMemoryEventTable'

beforeEach(() => { window.localStorage.clear(); window.location.hash = '' })
afterEach(() => cleanup())

// Tuesday 24 November 2026, 10:40 in Santa Clara.
const NOW = new Date('2026-11-24T18:40:00Z')
const DAY = '2026-11-24'
const ev = (id: string, title: string, start: string, end: string, attend?: 'set' | 'dropin'): DiscoverEvent =>
  ({ id, title, date: DAY, start, end, hostName: 'Club', location: 'Benson', description: 'About it.', ...(attend ? { attend } : {}) })
const fair = ev('fair', 'Volunteer fair', '11:00', '15:00', 'dropin')
const talk = ev('talk', 'Lunch talk', '13:00', '15:00')

describe('Post: how to attend', () => {
  const futureDate = () => { const d = new Date(); d.setDate(d.getDate() + 7); return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-') }
  const setup = () => {
    const rows = new Map<string, EventRow>()
    render(<EmbeddedPostEventForm connection={{ catalog: createEventCatalog(createInMemoryEventTable(rows)), shared: true }} />)
    const group = screen.getByRole('radiogroup', { name: /^how to attend$/i })
    return { rows, group, set: within(group).getByRole('radio', { name: 'Starts at a set time' }) as HTMLInputElement, dropIn: within(group).getByRole('radio', { name: 'Drop in any time' }) as HTMLInputElement }
  }
  const fill = async (user: ReturnType<typeof userEvent.setup>, title: string) => {
    await user.type(screen.getByLabelText('EVENT NAME'), title)
    if (!(screen.getByLabelText('HOST NAME') as HTMLInputElement).value) await user.type(screen.getByLabelText('HOST NAME'), 'Ignatian Center')
    await user.type(screen.getByLabelText('DESCRIPTION'), 'Meet local groups.')
    await user.type(screen.getByLabelText('LOCATION'), 'Locatelli Center')
    fireEvent.change(screen.getByLabelText('DATE'), { target: { value: futureDate() } })
    fireEvent.change(screen.getByLabelText('START'), { target: { value: '11:00' } })
    fireEvent.change(screen.getByLabelText('END'), { target: { value: '15:00' } })
    await user.click(screen.getByRole('button', { name: /post event/i }))
  }

  it('is one choice of exactly two, with "Starts at a set time" chosen to begin with', () => {
    const { group, set, dropIn } = setup()
    expect(within(group).getAllByRole('radio')).toHaveLength(2)
    expect(set.checked).toBe(true)
    expect(dropIn.checked).toBe(false)
    // One group, so the browser moves between the two with the arrow keys and Tab lands on the chosen one.
    expect(set.name).toBe(dropIn.name)
    expect(set.name).not.toBe('')
    // Styled as the "Good to know" strips, with the chosen one marked.
    expect(set.closest('label')!.className).toContain('sq-post-tag')
    expect(set.closest('label')!.className).toContain('sq-on')
    expect(dropIn.closest('label')!.className).not.toContain('sq-on')
    // The form gained this one control and no other field.
    expect(screen.getAllByRole('radio')).toHaveLength(2)
    expect(document.querySelectorAll('.event-form input[type="text"], .event-form textarea')).toHaveLength(4)
  })
  it('posts a drop-in event when the host taps "Drop in any time"', async () => {
    const user = userEvent.setup({ delay: null })
    const { rows, set, dropIn } = setup()
    await user.click(dropIn)
    expect(dropIn.checked).toBe(true)
    expect(set.checked).toBe(false)
    expect(dropIn.closest('label')!.className).toContain('sq-on')
    await fill(user, 'Volunteer fair')
    await waitFor(() => expect(rows.size).toBe(1))
    expect([...rows.values()][0]).toMatchObject({ title: 'Volunteer fair', attend: 'dropin' })
  })
  it('posts a set-time event when the choice is left alone, with no attend value stored', async () => {
    const user = userEvent.setup({ delay: null })
    const { rows } = setup()
    await fill(user, 'Lunch talk')
    await waitFor(() => expect(rows.size).toBe(1))
    expect([...rows.values()][0]).not.toHaveProperty('attend')
  })
  // Moving between the two with the arrow keys is the browser's own radio behaviour: e2e-demo/drop-in.spec.ts presses the keys.
})

describe('ticket: "Drop in" where the length would be', () => {
  const stub = (event: DiscoverEvent) => toStub(event, NOW, new Set(), null)
  it('shows "Drop in" in the length\'s own element, and no length', () => {
    const { container } = render(<EventStub stub={stub(fair)} onSelect={() => {}} />)
    const length = container.querySelector('.sq-stub-time em')!
    expect(length.querySelector('.sq-dur-part')).not.toBeNull()
    expect(length.textContent).toBe('Drop in any time')
    expect(length.querySelector('.sq-visually-hidden')!.textContent).toBe(' any time')
    expect(container.querySelector('.sq-stub-time')!.textContent).not.toMatch(/4 hr/)
    // Nothing else on the ticket changes: the start and end are still there.
    expect(container.querySelector('.sq-stub-time b')!.textContent).toBe('11:00am')
    expect(container.querySelector('.sq-stub-time small')!.textContent).toBe('to 3:00pm')
  })
  it('includes "drop in any time" in the ticket\'s accessible name', () => {
    render(<EventStub stub={stub(fair)} onSelect={() => {}} extraLabel="Maya is going" />)
    expect(screen.getByRole('button', { name: 'View details for Volunteer fair, drop in any time. Maya is going' })).toBeTruthy()
  })
  it('leaves a set-time ticket exactly as it was', () => {
    const { container } = render(<EventStub stub={stub(talk)} onSelect={() => {}} />)
    expect(container.querySelector('.sq-stub-time em')!.textContent).toBe('2 hr')
    expect(screen.getByRole('button', { name: 'View details for Lunch talk' })).toBeTruthy()
    expect(container.textContent).not.toMatch(/drop in/i)
  })
  it('says it on a ticket that is not a button too (My Schedule, Groups)', () => {
    const { container } = render(<EventStub stub={stub(fair)} />)
    expect(container.querySelector('.sq-stub')!.textContent).toMatch(/Drop in any time/)
  })
  it('carries the drop-in fit mark on Discover', () => {
    render(<DiscoverView screen={presentDiscover({ events: [fair, talk], freeWindows: [{ date: DAY, start: '13:10', end: '13:55' }], now: NOW })} />)
    const ticket = screen.getByRole('button', { name: 'View details for Volunteer fair, drop in any time' })
    const mark = within(ticket).getByRole('img', { name: 'Drop in for up to 45 min of your free time, 1:10–1:55pm.' })
    expect(mark.textContent).toBe('Drop in 45 min')
    expect(mark.className).toContain('sq-fitmark-fits')
    expect(mark.className).toContain('sq-fitmark-dropin')
    // The set-time talk runs past the free time, so it is not in the list.
    expect(screen.queryByRole('button', { name: /Lunch talk/ })).toBeNull()
  })
})

describe('fit mark: drawn the same way', () => {
  it('has the free stretch, the event inside it and the event either side', () => {
    render(<FitMark mark={presentFitMark(fair, [{ date: DAY, start: '13:10', end: '13:55' }])!} />)
    const mark = screen.getByRole('img', { name: 'Drop in for up to 45 min of your free time, 1:10–1:55pm.' })
    expect(mark.querySelectorAll('.sq-fitmark-free')).toHaveLength(1)
    expect(mark.querySelectorAll('.sq-fitmark-in')).toHaveLength(1)
    expect(mark.querySelectorAll('.sq-fitmark-out')).toHaveLength(2)
    expect(mark.querySelector('.sq-fitmark-words')!.textContent).toBe('Drop in 45 min')
  })
  it('keeps a set-time mark free of the drop-in class', () => {
    render(<FitMark mark={presentFitMark(talk, [{ date: DAY, start: '13:10', end: '13:55' }])!} />)
    expect(screen.getByRole('img').className).toBe('sq-fitmark sq-fitmark-over')
  })
})

describe('opened card: one plain line', () => {
  const open = (event: DiscoverEvent, quiet: boolean) => render(
    <QuietContext.Provider value={quiet}>
      <EventDetailContent selected={toStub(event, NOW, new Set(), null)} verified={null} planningBlocked={false} onClose={() => {}} />
    </QuietContext.Provider>)
  it.each([true, false])('says when to drop in (new look: %s)', quiet => {
    const { container } = open(fair, quiet)
    const lines = container.querySelectorAll('.sq-dropin-line')
    expect(lines).toHaveLength(1)
    expect(lines[0].tagName).toBe('P')
    expect(lines[0].textContent).toBe('Drop in any time between 11am and 3pm.')
  })
  it.each([true, false])('says nothing for a set-time event (new look: %s)', quiet => {
    const { container } = open(talk, quiet)
    expect(container.querySelector('.sq-dropin-line')).toBeNull()
    expect(container.textContent).not.toMatch(/drop in/i)
  })
})
