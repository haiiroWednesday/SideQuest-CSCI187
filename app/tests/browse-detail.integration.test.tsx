// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../src/App'
import type { CampusEvent, EventCatalogPort } from '../src/model/eventCatalog'

const FIRST = '11111111-1111-4111-8111-111111111111'
const SECOND = '22222222-2222-4222-8222-222222222222'
const now = () => new Date('2030-11-07T09:00:00-08:00')
const a: CampusEvent = {
  id: FIRST,
  title: 'Art Workshop',
  hostName: 'Club A',
  description: 'Old list summary A',
  location: 'Arts Building',
  date: '2030-11-07',
  start: '14:30',
  end: '15:30',
}
const b: CampusEvent = {
  ...a,
  id: SECOND,
  hostName: 'Club B',
  description: 'Old list summary B',
  start: '16:00',
  end: '17:00',
}
const catalog = (
  getById: EventCatalogPort['getById'],
  events: CampusEvent[] = [a, b],
): EventCatalogPort => ({
  create: vi.fn(async draft => ({ id: FIRST, ...draft })),
  listUpcoming: vi.fn(async () => events),
  getById,
})
const deferred = <T,>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(r => {
    resolve = r
  })
  return { promise, resolve }
}

beforeEach(() => {
  window.localStorage.clear()
  window.location.hash = '#discover'
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("M2 Discover: integrate Devonny's selected-event behavior", () => {
  it('fetches fresh details by ID while preserving our ticket design', async () => {
    const getById = vi.fn(async id =>
      id === SECOND ? { ...b, description: 'Fresh details for Club B' } : a,
    )
    render(<App catalog={{ catalog: catalog(getById), shared: true }} now={now} />)
    await screen.findAllByRole('button', { name: 'View details for Art Workshop' })
    const tickets = screen.getAllByRole('button', { name: 'View details for Art Workshop' })
    await userEvent.click(tickets[1])
    const panel = screen.getByRole('complementary')
    expect(await within(panel).findByText('Fresh details for Club B')).toBeTruthy()
    expect(within(panel).getByText('Club B')).toBeTruthy()
    expect(getById).toHaveBeenCalledWith(SECOND)
  })

  it('separates confirmed missing from network failure and disables planning on both', async () => {
    const getById = vi.fn(async () => null)
    render(<App catalog={{ catalog: catalog(getById, [a]), shared: true }} now={now} />)
    await userEvent.click(
      await screen.findByRole('button', { name: 'View details for Art Workshop' }),
    )
    const panel = screen.getByRole('complementary')
    expect(
      await within(panel).findByText('This event is no longer available in the public catalog.'),
    ).toBeTruthy()
    expect(within(panel).queryByRole('button', { name: /Plan to attend/ })).toBeNull()
  })

  it('retries an interrupted detail lookup without reloading the whole event list', async () => {
    const getById = vi
      .fn()
      .mockRejectedValueOnce(Error('offline'))
      .mockResolvedValueOnce({
        ...a,
        description: 'Recovered description',
      })
    const listUpcoming = vi.fn(async () => [a])
    render(
      <App catalog={{ catalog: { ...catalog(getById), listUpcoming }, shared: true }} now={now} />,
    )
    await userEvent.click(
      await screen.findByRole('button', { name: 'View details for Art Workshop' }),
    )
    const panel = screen.getByRole('complementary')
    expect(await within(panel).findByText(/Could not load this event/)).toBeTruthy()
    expect(within(panel).queryByRole('button', { name: '+ Plan to attend' })).toBeNull()
    await userEvent.click(within(panel).getByRole('button', { name: 'Retry event details' }))
    expect(await within(panel).findByText('Recovered description')).toBeTruthy()
    expect(getById).toHaveBeenCalledTimes(2)
    expect(listUpcoming).toHaveBeenCalledTimes(1)
  })

  it('ignores a late lookup for an event that is no longer selected', async () => {
    const first = deferred<CampusEvent | null>()
    const second = deferred<CampusEvent | null>()
    const getById = vi.fn((id: string) => (id === FIRST ? first.promise : second.promise))
    render(<App catalog={{ catalog: catalog(getById), shared: true }} now={now} />)
    const tickets = await screen.findAllByRole('button', { name: 'View details for Art Workshop' })
    const user = userEvent.setup()
    await user.click(tickets[0])
    await user.click(tickets[1])
    await act(async () => {
      second.resolve({ ...b, description: 'Second event confirmed' })
    })
    const panel = screen.getByRole('complementary')
    expect(await within(panel).findByText('Second event confirmed')).toBeTruthy()
    await act(async () => {
      first.resolve({ ...a, description: 'Late first event' })
    })
    await waitFor(() => expect(within(panel).getByText('Second event confirmed')).toBeTruthy())
    expect(within(panel).queryByText('Late first event')).toBeNull()
  })
})
