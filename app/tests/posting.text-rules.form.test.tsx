// @vitest-environment jsdom
// Posting form text rules, and older long events in the real App screens.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../src/App'
import { PostEventForm } from '../src/view/PostEventForm'
import { POSTING_LIMITS } from '../src/controller/postEvent'
import { createEventCatalog, toEventRow, type EventDraft, type EventRow } from '../src/model/eventCatalog'
import { createInMemoryEventTable } from '../src/model/inMemoryEventTable'
import { PLANNED_IDS_KEY } from '../src/model/schedule'

// 09:00 in Santa Clara on 2030-11-07; posted events are a week later.
const now = () => new Date('2030-11-07T09:00:00-08:00')
const LABELS = { title: 'EVENT NAME', hostName: 'HOST NAME', description: 'DESCRIPTION', location: 'LOCATION' } as const
const valid: EventDraft = {
  title: 'Photo Walk', hostName: 'Art Club', description: 'Bring a camera.', location: 'Library',
  date: '2030-11-14', start: '14:30', end: '15:30',
}

const form = () => within(document.querySelector<HTMLFormElement>('.event-form')!)
function renderForm() {
  const rows = new Map<string, EventRow>()
  render(<PostEventForm connection={{ catalog: createEventCatalog(createInMemoryEventTable(rows), now), shared: true }} now={now} />)
  return rows
}
// fireEvent.change sets the value directly, as a paste or script could; jsdom
// does not apply maxLength, so the Model rule is what rejects these.
async function submit(values: Partial<EventDraft>) {
  const f = form()
  const draft = { ...valid, ...values }
  for (const field of Object.keys(LABELS) as (keyof typeof LABELS)[]) fireEvent.change(f.getByLabelText(LABELS[field]), { target: { value: draft[field] } })
  fireEvent.change(f.getByLabelText('DATE'), { target: { value: draft.date } })
  fireEvent.change(f.getByLabelText('START'), { target: { value: draft.start } })
  fireEvent.change(f.getByLabelText('END'), { target: { value: draft.end } })
  await userEvent.click(f.getByRole('button', { name: /post event/i }))
}

beforeEach(() => { window.localStorage.clear(); window.location.hash = '' })
afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('Post form text rules', () => {
  it('limits typing to the posting limits', () => {
    renderForm()
    for (const field of Object.keys(LABELS) as (keyof typeof LABELS)[]) {
      expect(form().getByLabelText(LABELS[field]).getAttribute('maxlength')).toBe(String(POSTING_LIMITS[field]))
    }
  })

  it.each(Object.keys(LABELS) as (keyof typeof LABELS)[])('%s: shows the posting limit one over and does not post', async field => {
    const rows = renderForm()
    await submit({ [field]: 'x'.repeat(POSTING_LIMITS[field] + 1) })
    expect(await form().findByText(`must be ${POSTING_LIMITS[field]} characters or fewer`, { exact: false })).toBeTruthy()
    expect(form().getByLabelText(LABELS[field]).getAttribute('aria-invalid')).toBe('true')
    expect(rows.size).toBe(0)
  })

  it('posts every field at its posting limit', async () => {
    const rows = renderForm()
    await submit({ title: 'x'.repeat(80), hostName: 'x'.repeat(60), description: 'x'.repeat(1000), location: 'x'.repeat(120) })
    await waitFor(() => expect(rows.size).toBe(1))
  })

  it('rejects a title of only symbols, then accepts a Unicode title', async () => {
    const rows = renderForm()
    await submit({ title: '&&&&' })
    expect(await form().findByText('The event title must include at least one letter or number.')).toBeTruthy()
    expect(rows.size).toBe(0)
    await submit({ title: '読書会' })
    await waitFor(() => expect([...rows.values()].map(row => row.title)).toEqual(['読書会']))
  })
})

describe('events stored before the posting limits', () => {
  it('list in Discover, open details and can be planned', async () => {
    const rows = new Map<string, EventRow>()
    const title = '&'.repeat(120)
    const stored = await createInMemoryEventTable(rows).insert(toEventRow({
      ...valid, date: '2030-11-07', title, hostName: 'H'.repeat(120), description: 'D'.repeat(2000), location: 'L'.repeat(200),
    }))
    window.location.hash = '#discover'
    render(<App catalog={{ catalog: createEventCatalog(createInMemoryEventTable(rows), now), shared: true }} now={now} />)
    await userEvent.click((await screen.findAllByRole('button', { name: `View details for ${title}` }))[0])
    const panel = screen.getByRole('complementary')
    expect(await within(panel).findByText('D'.repeat(2000))).toBeTruthy()
    await userEvent.click(within(panel).getByRole('button', { name: '+ Plan to attend' }))
    await waitFor(() => expect(JSON.parse(window.localStorage.getItem(PLANNED_IDS_KEY) ?? '[]')).toEqual([stored.id]))
  })
})

describe('Post form character counters', () => {
  const count = (field: keyof typeof LABELS) => document.getElementById(`post-${field}-count`)
  const set = (field: keyof typeof LABELS, value: string) => fireEvent.change(form().getByLabelText(LABELS[field]), { target: { value } })
  const describedBy = (field: keyof typeof LABELS | 'date') => form().getByLabelText(field === 'date' ? 'DATE' : LABELS[field]).getAttribute('aria-describedby')

  it('always shows the description counter, from 0 to the limit, without a live region', async () => {
    renderForm()
    expect(count('description')?.textContent).toBe('0/1000 characters')
    expect(describedBy('description')).toBe('post-description-count')
    await userEvent.type(form().getByLabelText('DESCRIPTION'), 'Hello')
    expect(count('description')?.textContent).toBe('5/1000 characters')
    expect(count('description')?.hasAttribute('data-at-limit')).toBe(false)
    set('description', 'x'.repeat(1000))
    expect(count('description')?.textContent).toBe('1000/1000 characters')
    expect(count('description')?.hasAttribute('data-at-limit')).toBe(true)
    expect(count('description')?.getAttribute('aria-live')).toBeNull()
    expect(count('description')?.getAttribute('role')).toBeNull()
  })

  it('counts the raw value, including spaces, as maxLength does', () => {
    renderForm()
    set('description', '  ab  ')
    expect(count('description')?.textContent).toBe('6/1000 characters')
  })

  it.each([['title', 64], ['hostName', 48], ['location', 96]] as const)('%s: shows its counter only from %i characters', (field, threshold) => {
    renderForm()
    const limit = POSTING_LIMITS[field]
    expect(count(field)).toBeNull()
    set(field, 'x'.repeat(threshold - 1))
    expect(count(field)).toBeNull()
    expect(describedBy(field)).toBeNull()
    set(field, 'x'.repeat(threshold))
    expect(count(field)?.textContent).toBe(`${threshold}/${limit} characters`)
    expect(describedBy(field)).toBe(`post-${field}-count`)
    expect(count(field)?.hasAttribute('data-at-limit')).toBe(false)
    set(field, 'x'.repeat(limit))
    expect(count(field)?.textContent).toBe(`${limit}/${limit} characters`)
    expect(count(field)?.hasAttribute('data-at-limit')).toBe(true)
  })

  it('describes a field by both its error and its counter, and leaves other fields alone', async () => {
    renderForm()
    await submit({ title: '&'.repeat(70) })
    expect(await form().findByText('The event title must include at least one letter or number.')).toBeTruthy()
    expect(describedBy('title')).toBe('post-title-error post-title-count')
    expect(describedBy('date')).toBeNull()
  })
})
