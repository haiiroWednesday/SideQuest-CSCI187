// @vitest-environment jsdom
// Rendered posting form tests. Test owner: Daven.
// The form talks only to an EventCatalogPort. Here that is the in-memory test
// fixture or the browser-only fallback. Supabase is never contacted.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../src/App'
import { PostEventForm } from '../src/view/PostEventForm'
import { createEventCatalog, EventCatalogError, type EventCatalogPort, type EventRow } from '../src/model/eventCatalog'
import { createInMemoryEventTable } from '../src/model/inMemoryEventTable'
import { LOCAL_CATALOG_KEY } from '../src/model/browserEventTable'
import { STORAGE_KEY as M1_STORAGE_KEY } from '../src/model/events'
import { campusDateFromToday } from './fixtures/campusDates'

type User = ReturnType<typeof userEvent.setup>

function futureDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-')
}

const form = () => {
  const element = document.querySelector<HTMLFormElement>('.event-form')
  if (!element) throw new Error('Post form was not rendered')
  return within(element)
}

async function fillAndPost(user: User, values: { title?: string; hostName?: string; description?: string; location?: string; start?: string; end?: string } = {}) {
  const f = form()
  const v = { title: 'Photo Walk', hostName: 'SCU Photography Club', description: 'Bring any camera.', location: 'Mission Gardens', start: '14:30', end: '15:30', ...values }
  if (v.title) await user.type(f.getByLabelText('EVENT NAME'), v.title)
  if (v.hostName) await user.type(f.getByLabelText('HOST NAME'), v.hostName)
  if (v.description) await user.type(f.getByLabelText('DESCRIPTION'), v.description)
  if (v.location) await user.type(f.getByLabelText('LOCATION'), v.location)
  fireEvent.change(f.getByLabelText('DATE'), { target: { value: futureDate() } })
  fireEvent.change(f.getByLabelText('START'), { target: { value: v.start } })
  fireEvent.change(f.getByLabelText('END'), { target: { value: v.end } })
  await user.click(f.getByRole('button', { name: /post event/i }))
}

const postedList = () => within(screen.getByRole('region', { name: /posted events/i }))

beforeEach(() => { window.localStorage.clear(); window.location.hash = '' })
afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('PostEventForm', () => {
  it('posts to the catalog, shows the new ID, and lists the event with its host', async () => {
    const user = userEvent.setup()
    const rows = new Map<string, EventRow>()
    render(<PostEventForm connection={{ catalog: createEventCatalog(createInMemoryEventTable(rows)), shared: true }} />)

    await fillAndPost(user)

    const status = await screen.findByRole('status')
    const [id] = [...rows.keys()]
    expect(status.textContent).toContain('Posted “Photo Walk” to the shared catalog')
    expect(status.textContent).toContain(`Event ID: ${id}`)
    await waitFor(() => expect(postedList().getByText('Photo Walk')).toBeTruthy())
    expect(postedList().getByText('Hosted by SCU Photography Club')).toBeTruthy()
    // Title, description and location clear for the next post. Host name stays.
    expect((form().getByLabelText('EVENT NAME') as HTMLInputElement).value).toBe('')
    expect((form().getByLabelText('HOST NAME') as HTMLInputElement).value).toBe('SCU Photography Club')
    expect(screen.queryByTestId('catalog-not-shared')).toBeNull()
  })

  it('shows a whitespace-only title error next to the title field and stores nothing', async () => {
    const user = userEvent.setup()
    const rows = new Map<string, EventRow>()
    render(<PostEventForm connection={{ catalog: createEventCatalog(createInMemoryEventTable(rows)), shared: true }} />)

    await fillAndPost(user, { title: '   ' })

    const title = form().getByLabelText('EVENT NAME')
    expect(title.getAttribute('aria-invalid')).toBe('true')
    expect(document.getElementById(title.getAttribute('aria-describedby')!)?.textContent).toContain('Please enter the event title.')
    expect(screen.getByRole('alert').textContent).toContain('Please fix the highlighted fields.')
    expect(rows.size).toBe(0)
  })

  it('flags reversed times on END and a missing host name at the same time', async () => {
    const user = userEvent.setup()
    const rows = new Map<string, EventRow>()
    render(<PostEventForm connection={{ catalog: createEventCatalog(createInMemoryEventTable(rows)), shared: true }} />)

    await fillAndPost(user, { hostName: '', start: '17:00', end: '16:00' })

    expect(form().getByLabelText('END').getAttribute('aria-invalid')).toBe('true')
    expect(form().getByLabelText('HOST NAME').getAttribute('aria-invalid')).toBe('true')
    expect(form().getByText('The event must end later than it starts, on the same day.')).toBeTruthy()
    expect(rows.size).toBe(0)
  })

  it('shows field errors after blur and keeps them until the value becomes valid', async () => {
    const user = userEvent.setup()
    const rows = new Map<string, EventRow>()
    render(<PostEventForm connection={{ catalog: createEventCatalog(createInMemoryEventTable(rows)), shared: true }} />)

    const title = form().getByLabelText('EVENT NAME')
    await user.type(title, '  ')
    fireEvent.blur(title)
    expect(title.getAttribute('aria-invalid')).toBe('true')
    expect(form().getByText('Please enter the event title.')).toBeTruthy()

    // Typing more spaces does not conceal an existing validation error.
    await user.type(title, ' ')
    expect(title.getAttribute('aria-invalid')).toBe('true')
    await user.type(title, 'Photography workshop')
    expect(title.getAttribute('aria-invalid')).toBeNull()
    expect(form().queryByText('Please enter the event title.')).toBeNull()
    expect(rows.size).toBe(0)
  })

  it('revalidates an END error when START is corrected', async () => {
    const rows = new Map<string, EventRow>()
    render(<PostEventForm connection={{ catalog: createEventCatalog(createInMemoryEventTable(rows)), shared: true }} />)

    const start = form().getByLabelText('START')
    const end = form().getByLabelText('END')
    fireEvent.change(start, { target: { value: '17:00' } })
    fireEvent.change(end, { target: { value: '16:00' } })
    fireEvent.blur(end)
    expect(end.getAttribute('aria-invalid')).toBe('true')
    fireEvent.change(start, { target: { value: '15:00' } })
    expect(end.getAttribute('aria-invalid')).toBeNull()
    expect(rows.size).toBe(0)
  })

  it('checks an invalid date on blur without creating a post', async () => {
    const rows = new Map<string, EventRow>()
    render(<PostEventForm connection={{ catalog: createEventCatalog(createInMemoryEventTable(rows)), shared: true }} />)
    const date = form().getByLabelText('DATE')
    fireEvent.change(date, { target: { value: campusDateFromToday(30) } })
    fireEvent.blur(date)
    expect(date.getAttribute('aria-invalid')).toBeNull()
    fireEvent.change(date, { target: { value: '2020-11-08' } })
    expect(date.getAttribute('aria-invalid')).toBe('true')
    expect(rows.size).toBe(0)
  })

  it('caps the date input one campus year ahead and shows a field error beyond it', async () => {
    const user = userEvent.setup()
    const rows = new Map<string, EventRow>()
    // 12:00 noon in Santa Clara on 2026-11-08; the form and catalog share the clock.
    const now = () => new Date('2026-11-08T20:00:00Z')
    render(<PostEventForm now={now} connection={{ catalog: createEventCatalog(createInMemoryEventTable(rows), now), shared: true }} />)
    const date = form().getByLabelText('DATE')
    expect(date.getAttribute('min')).toBe('2026-11-08')
    expect(date.getAttribute('max')).toBe('2027-11-08')
    fireEvent.change(date, { target: { value: '2027-11-08' } })
    fireEvent.blur(date)
    expect(date.getAttribute('aria-invalid')).toBeNull()
    for (const value of ['2027-11-09', '9999-12-31']) {
      fireEvent.change(date, { target: { value } })
      fireEvent.blur(date)
      expect(date.getAttribute('aria-invalid')).toBe('true')
      expect(document.getElementById('post-date-error')?.textContent).toContain('Events can be posted up to one year ahead. Choose a date on or before 2027-11-08.')
    }
    await user.click(form().getByRole('button', { name: /post event/i }))
    expect(date.getAttribute('aria-invalid')).toBe('true')
    expect(rows.size).toBe(0)
  })

  it('shows an honest error on server failure and keeps what the user typed', async () => {
    const user = userEvent.setup()
    const down: EventCatalogPort = {
      create: async () => { throw new EventCatalogError('unavailable', 'Could not post this event right now. Please check your connection and try again.') },
      listUpcoming: async () => [],
      getById: async () => null,
    }
    render(<PostEventForm connection={{ catalog: down, shared: true }} />)

    await fillAndPost(user)

    expect((await screen.findByRole('alert')).textContent).toContain('Could not post this event right now')
    expect((form().getByLabelText('EVENT NAME') as HTMLInputElement).value).toBe('Photo Walk')
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('keeps each field’s accessible name equal to its label, even after typing', async () => {
    const user = userEvent.setup()
    render(<PostEventForm connection={{ catalog: createEventCatalog(createInMemoryEventTable()), shared: true }} />)

    // A label wrapped around a textarea would make its name "DESCRIPTION Paint with friends".
    await user.type(form().getByLabelText('DESCRIPTION'), 'Paint with friends')

    expect(screen.getByRole('textbox', { name: 'DESCRIPTION' })).toBeTruthy()
    expect(screen.getByRole('textbox', { name: 'EVENT NAME' })).toBeTruthy()
    expect(document.querySelector('label[for="post-end"]')?.textContent).toBe('END')
    expect(form().getByLabelText('END').id).toBe('post-end')
  })

  it('shows a retry option when the posted list cannot load', async () => {
    const user = userEvent.setup()
    let fail = true
    const flaky: EventCatalogPort = {
      create: async () => { throw new Error('unused') },
      listUpcoming: async () => { if (fail) throw new EventCatalogError('unavailable', 'Could not load events right now.'); return [] },
      getById: async () => null,
    }
    render(<PostEventForm connection={{ catalog: flaky, shared: true }} />)

    expect((await screen.findByRole('alert')).textContent).toContain('Could not load events right now.')
    fail = false
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('No upcoming events posted yet.')).toBeTruthy()
  })
})

describe('App with the browser-only fallback catalog', () => {
  it('a posted event is readable again after a refresh, and the M1 key is untouched', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(screen.getByTestId('catalog-not-shared').textContent).toContain('this browser only')

    await user.click(screen.getByRole('link', { name: 'Post an event' }))
    await waitFor(() => expect(document.querySelector('.event-form')).toBeTruthy())
    await fillAndPost(user)
    expect((await screen.findByRole('status')).textContent).toContain('this browser only')

    cleanup() // "refresh": unmount, keep localStorage, mount a brand-new App
    window.location.hash = '#discover'
    render(<App />)
    expect(await screen.findByRole('button', { name: 'View details for Photo Walk' })).toBeTruthy()
    expect(screen.getAllByText('SCU Photography Club').length).toBeGreaterThan(0)
    expect(window.localStorage.getItem(LOCAL_CATALOG_KEY)).toContain('Photo Walk')
    expect(window.localStorage.getItem(M1_STORAGE_KEY)).toBeNull()
  })
})
