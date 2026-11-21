// @vitest-environment jsdom
// Browsing contract hardening after Devonny's initial implementation.
// These tests use the real M2 port, not the old M1 preview catalog.
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadBrowseDetail } from '../src/controller/browseDetail'
import { useBrowseDetail } from '../src/view/useBrowseDetail'
import { CATALOG_READ_TIMEOUT_MS } from '../src/controller/catalogReads'
import { type CampusEvent, type EventCatalogPort } from '../src/model/eventCatalog'

const FIRST = '11111111-1111-4111-8111-111111111111'
const SECOND = '22222222-2222-4222-8222-222222222222'
const sample: CampusEvent = {
  id: FIRST,
  title: 'Poetry Evening',
  hostName: 'SCU Writers',
  description: 'Readings and conversations.',
  location: 'Library',
  date: '2030-11-07',
  start: '14:30',
  end: '15:30',
}

function port(getById: EventCatalogPort['getById']): EventCatalogPort {
  return {
    create: vi.fn(async draft => ({ id: FIRST, ...draft })),
    listUpcoming: vi.fn(async () => [sample]),
    getById,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('selected-event controller: validation and timeout boundaries', () => {
  it('accepts a database-valid 2000-character description without truncating it', async () => {
    const event = { ...sample, description: 'x'.repeat(2000) }
    const result = await loadBrowseDetail(
      port(async () => event),
      FIRST,
    )
    expect(result).toEqual({ status: 'ready', event })
  })

  it.each([
    ['description over the shared database limit', { description: 'x'.repeat(2001) }],
    ['missing required host', { hostName: '' }],
    ['invalid date', { date: '2030-02-30' }],
    ['an impossible end time', { end: '25:00' }],
    ['a swapped event ID', { id: SECOND }],
  ])('rejects %s instead of presenting it as a verified event', async (_case, changes) => {
    const result = await loadBrowseDetail(
      port(async () => ({ ...sample, ...changes })),
      FIRST,
    )
    expect(result).toMatchObject({
      status: 'error',
      message: expect.stringContaining('could not be verified'),
    })
  })

  it('turns a synchronous catalog exception into a retryable error', async () => {
    const result = await loadBrowseDetail(
      port(() => {
        throw Error('connection lost')
      }),
      FIRST,
    )
    expect(result).toEqual({
      status: 'error',
      message: 'Could not load this event. Please check your connection and try again.',
    })
  })

  it('stops waiting for a stalled catalog lookup instead of showing indefinite loading', async () => {
    vi.useFakeTimers()
    const never = new Promise<CampusEvent | null>(() => {})
    const lookup = loadBrowseDetail(
      port(() => never),
      FIRST,
    )
    await vi.advanceTimersByTimeAsync(CATALOG_READ_TIMEOUT_MS + 1)
    await expect(lookup).resolves.toEqual({
      status: 'error',
      message: 'Loading events took too long. Please try again.',
    })
  })
})

describe('useBrowseDetail: asynchronous selection lifecycle', () => {
  it('does not request details before the student selects an event, and retry is initially harmless', () => {
    const getById = vi.fn(async () => sample)
    const stableCatalog = port(getById)
    const { result } = renderHook(() => useBrowseDetail(stableCatalog))
    expect(result.current.state).toBeNull()
    act(() => {
      result.current.retry()
    })
    expect(getById).not.toHaveBeenCalled()
  })

  it('shows loading before resolution and preserves the requested ID', async () => {
    const pending = deferred<CampusEvent | null>()
    const stableCatalog = port(() => pending.promise)
    const { result } = renderHook(() => useBrowseDetail(stableCatalog))
    act(() => {
      result.current.open(FIRST)
    })
    expect(result.current.state).toEqual({ id: FIRST, status: 'loading' })
    await act(async () => {
      pending.resolve(sample)
    })
    expect(result.current.state).toEqual({ id: FIRST, status: 'ready', event: sample })
  })

  it('ignores a stale failed request after a different event is successfully selected', async () => {
    const first = deferred<CampusEvent | null>()
    const getById = (id: string) =>
      id === FIRST ? first.promise : Promise.resolve({ ...sample, id: SECOND })
    const stableCatalog = port(getById)
    const { result } = renderHook(() => useBrowseDetail(stableCatalog))
    act(() => {
      result.current.open(FIRST)
      result.current.open(SECOND)
    })
    await waitFor(() => expect(result.current.state).toMatchObject({ id: SECOND, status: 'ready' }))
    await act(async () => {
      first.reject(Error('offline'))
    })
    expect(result.current.state).toMatchObject({ id: SECOND, status: 'ready' })
  })

  it('ignores an earlier response when the same event ID is retried', async () => {
    const older = deferred<CampusEvent | null>()
    const newer = deferred<CampusEvent | null>()
    const getById = vi
      .fn()
      .mockImplementationOnce(() => older.promise)
      .mockImplementationOnce(() => newer.promise)
    const stableCatalog = port(getById)
    const { result } = renderHook(() => useBrowseDetail(stableCatalog))
    act(() => {
      result.current.open(FIRST)
    })
    act(() => {
      result.current.retry()
    })
    await act(async () => {
      newer.resolve({ ...sample, description: 'Confirmed after retry' })
    })
    expect(result.current.state).toMatchObject({
      id: FIRST,
      status: 'ready',
      event: { description: 'Confirmed after retry' },
    })
    await act(async () => {
      older.resolve({ ...sample, description: 'Outdated first response' })
    })
    expect(result.current.state).toMatchObject({
      event: { description: 'Confirmed after retry' },
    })
    expect(getById).toHaveBeenCalledTimes(2)
  })

  it('does not let a response from a replaced catalog overwrite the new catalog result', async () => {
    const oldResponse = deferred<CampusEvent | null>()
    const oldCatalog = port(() => oldResponse.promise)
    const newCatalog = port(async () => ({ ...sample, description: 'New catalog data' }))
    const { result, rerender } = renderHook(({ catalog }) => useBrowseDetail(catalog), {
      initialProps: { catalog: oldCatalog },
    })
    act(() => {
      result.current.open(FIRST)
    })
    rerender({ catalog: newCatalog })
    act(() => {
      result.current.open(FIRST)
    })
    await waitFor(() =>
      expect(result.current.state).toMatchObject({
        status: 'ready',
        event: { description: 'New catalog data' },
      }),
    )
    await act(async () => {
      oldResponse.resolve({ ...sample, description: 'Old catalog data' })
    })
    expect(result.current.state).toMatchObject({ event: { description: 'New catalog data' } })
  })

  it('ignores a response that resolves after the selecting component unmounts', async () => {
    const pending = deferred<CampusEvent | null>()
    const stableCatalog = port(() => pending.promise)
    const { result, unmount } = renderHook(() => useBrowseDetail(stableCatalog))
    act(() => {
      result.current.open(FIRST)
    })
    unmount()
    await act(async () => {
      pending.resolve(sample)
    })
    // The important behavior is that the request can finish safely; the
    // hook's effect cleanup invalidates its pending generation.
    expect(result.current.state).toEqual({ id: FIRST, status: 'loading' })
  })
})
