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

beforeEach(() => window.localStorage.clear())
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

    await fillAndPost(user)
    expect((await screen.findByRole('status')).textContent).toContain('this browser only')

    cleanup() // "refresh": unmount, keep localStorage, mount a brand-new App
    render(<App />)
    await waitFor(() => expect(postedList().getByText('Photo Walk')).toBeTruthy())
    expect(postedList().getByText('Hosted by SCU Photography Club')).toBeTruthy()
    expect(window.localStorage.getItem(LOCAL_CATALOG_KEY)).toContain('Photo Walk')
    expect(window.localStorage.getItem(M1_STORAGE_KEY)).toBeNull()
  })
})
