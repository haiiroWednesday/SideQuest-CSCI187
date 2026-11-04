// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EventBrowser from '../src/presentation/EventBrowser'
import type { CatalogEvent, EventCatalogPort } from '../src/controller/browseEvents'

const first: CatalogEvent = {
  id: 'event-1', title: 'Art Workshop', hostName: 'Alex', description: 'Paint together.',
  location: 'Arts Building', date: '2026-11-10', start: '14:30', end: '15:30',
}
const second: CatalogEvent = {
  ...first, id: 'event-2', hostName: 'Jordan', description: 'A different workshop.',
}

function catalog(overrides: Partial<EventCatalogPort> = {}): EventCatalogPort {
  return {
    listUpcoming: vi.fn().mockResolvedValue([first, second]),
    getById: vi.fn().mockImplementation(async (id: string) => [first, second].find(event => event.id === id) ?? null),
    ...overrides,
  }
}

afterEach(cleanup)

describe('EventBrowser', () => {
  it('shows loading and displays selected details inside the corresponding event card', async () => {
    let resolveList!: (events: CatalogEvent[]) => void
    const port = catalog({
      listUpcoming: vi.fn(() => new Promise<CatalogEvent[]>(resolve => { resolveList = resolve })),
    })
    render(<EventBrowser catalog={port} />)

    expect(screen.getByRole('status').textContent).toContain('Loading upcoming events')
    resolveList([first])
    expect(await screen.findByText('Alex · 11/10/2026 · 2:30pm–3:30pm · Arts Building')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'View details for Art Workshop (event-1)' }))

    expect(await screen.findByText('Paint together.')).toBeTruthy()
    expect(screen.getByText('Paint together.').closest('li')?.querySelector('[aria-label="Details for Art Workshop"]')).toBeTruthy()
    expect(screen.getByText('Host:').parentElement?.textContent).toContain('Alex')
    expect(screen.getByText('Location:').parentElement?.textContent).toContain('Arts Building')
    expect(screen.getByText('Date:').parentElement?.textContent).toContain('11/10/2026')
    expect(screen.getByText('Time:').parentElement?.textContent).toContain('2:30pm–3:30pm')
    expect(port.getById).toHaveBeenCalledWith('event-1')
  })

  it('loads details by stable ID when two events have the same title', async () => {
    const port = catalog()
    render(<EventBrowser catalog={port} />)

    await userEvent.click(await screen.findByRole('button', { name: 'View details for Art Workshop (event-2)' }))
    expect(await screen.findByText('A different workshop.')).toBeTruthy()
    expect(screen.getByText('Host:').parentElement?.textContent).toContain('Jordan')
    expect(port.getById).toHaveBeenCalledWith('event-2')
  })

  it('allows only one event to expand and collapses it when Details is clicked again', async () => {
    const port = catalog()
    const user = userEvent.setup()
    render(<EventBrowser catalog={port} />)

    await user.click(await screen.findByRole('button', { name: 'View details for Art Workshop (event-1)' }))
    expect(await screen.findByText('Paint together.')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'View details for Art Workshop (event-2)' }))
    expect(await screen.findByText('A different workshop.')).toBeTruthy()
    expect(screen.queryByText('Paint together.')).toBeNull()
    expect(screen.getByText('A different workshop.').closest('li')?.querySelector('button')?.getAttribute('aria-expanded')).toBe('true')

    await user.click(screen.getByRole('button', { name: 'View details for Art Workshop (event-2)' }))
    expect(screen.queryByText('A different workshop.')).toBeNull()
    expect(screen.getByRole('button', { name: 'View details for Art Workshop (event-2)' }).getAttribute('aria-expanded')).toBe('false')
  })

  it('shows an empty state when the catalog has no upcoming events', async () => {
    render(<EventBrowser catalog={catalog({ listUpcoming: vi.fn().mockResolvedValue([]) })} />)
    expect(await screen.findByText('There are no upcoming events.')).toBeTruthy()
  })

  it('shows a retryable error when the catalog list fails', async () => {
    const port = catalog({ listUpcoming: vi.fn().mockRejectedValue(new Error('offline')) })
    render(<EventBrowser catalog={port} />)

    expect((await screen.findByRole('alert')).textContent).toContain('Could not load upcoming events.')
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy()
  })

  it('distinguishes a missing event from a detail-fetch error and an unconnected catalog', async () => {
    const missingPort = catalog({ getById: vi.fn().mockResolvedValue(null) })
    render(<EventBrowser catalog={missingPort} />)
    await userEvent.click(await screen.findByRole('button', { name: 'View details for Art Workshop (event-1)' }))
    expect(await screen.findByText('This event is no longer available.')).toBeTruthy()

    cleanup()
    const failedPort = catalog({ getById: vi.fn().mockRejectedValue(new Error('offline')) })
    render(<EventBrowser catalog={failedPort} />)
    await userEvent.click(await screen.findByRole('button', { name: 'View details for Art Workshop (event-1)' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Could not load this event.')

    cleanup()
    render(<EventBrowser />)
    expect(await screen.findByText('The shared event catalog is not connected yet.')).toBeTruthy()
  })
})
