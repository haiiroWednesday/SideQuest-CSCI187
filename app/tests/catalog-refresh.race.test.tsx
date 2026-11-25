// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useCatalogEvents } from '../src/view/useCatalogEvents'
import type { CampusEvent, EventCatalogPort } from '../src/model/eventCatalog'

const first: CampusEvent = {
  id: '11111111-1111-4111-8111-111111111111', title: 'Older snapshot',
  hostName: 'Art Club', description: 'Test event', location: 'Library',
  date: '2030-11-07', start: '14:00', end: '15:00',
}
const second: CampusEvent = {
  ...first, id: '22222222-2222-4222-8222-222222222222', title: 'Newer snapshot',
}
function pendingRead() {
  let resolve!: (events: CampusEvent[]) => void
  let reject!: (error: Error) => void
  const promise = new Promise<CampusEvent[]>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
function catalog(listUpcoming: EventCatalogPort['listUpcoming']): EventCatalogPort {
  return {
    listUpcoming,
    getById: async () => null,
    create: async () => { throw new Error('Unexpected catalog write') },
  }
}
afterEach(cleanup)

describe('catalog snapshot generation: competing reads and lifecycle', () => {
  it.each(['success', 'failure'] as const)('ignores an older %s after the newer read succeeds', async outcome => {
    const old = pendingRead(), fresh = pendingRead()
    const list = vi.fn<() => Promise<CampusEvent[]>>()
      .mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise)
    const port = catalog(list)
    const { result } = renderHook(() => useCatalogEvents(port))
    expect(result.current.loading).toBe(true)
    let refresh!: Promise<void>
    act(() => { refresh = result.current.refresh() })
    expect(list).toHaveBeenCalledTimes(2)
    await act(async () => { fresh.resolve([second]); await refresh })
    const revision = result.current.revision
    expect(result.current).toMatchObject({ events: [second], error: null, loading: false })
    await act(async () => {
      if (outcome === 'success') old.resolve([first])
      else old.reject(new Error('Older provider failure'))
    })
    expect(result.current).toMatchObject({ events: [second], error: null, loading: false, revision })
  })

  it('keeps the current failure visible when an earlier read later succeeds', async () => {
    const old = pendingRead(), fresh = pendingRead()
    const port = catalog(vi.fn<() => Promise<CampusEvent[]>>()
      .mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise))
    const { result } = renderHook(() => useCatalogEvents(port))
    let refresh!: Promise<void>
    act(() => { refresh = result.current.refresh() })
    await act(async () => { fresh.reject(new Error('Latest failure')); await refresh })
    const failed = result.current
    expect(failed).toMatchObject({ events: [], error: 'Could not load posted events.', loading: false })
    await act(async () => { old.resolve([first]) })
    expect(result.current).toBe(failed)
  })

  it('invalidates a pending read when the catalog is replaced', async () => {
    const old = pendingRead(), fresh = pendingRead()
    const before = catalog(() => old.promise), after = catalog(() => fresh.promise)
    const { result, rerender } = renderHook(({ port }) => useCatalogEvents(port), { initialProps: { port: before } })
    rerender({ port: after })
    await act(async () => { fresh.resolve([second]) })
    const current = result.current
    await act(async () => { old.resolve([first]) })
    expect(current).toMatchObject({ events: [second], error: null, loading: false })
    expect(result.current).toBe(current)
  })

  it('invalidates the outstanding generation on a refresh-key change', async () => {
    const old = pendingRead(), fresh = pendingRead()
    const list = vi.fn<() => Promise<CampusEvent[]>>()
      .mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise)
    const port = catalog(list)
    const { result, rerender } = renderHook(({ key }) => useCatalogEvents(port, true, key), { initialProps: { key: 0 } })
    rerender({ key: 1 })
    expect(list).toHaveBeenCalledTimes(2)
    await act(async () => { old.resolve([first]) })
    expect(result.current).toMatchObject({ events: [], error: null, loading: true })
    await act(async () => { fresh.resolve([second]) })
    expect(result.current).toMatchObject({ events: [second], error: null, loading: false })
  })

  it('does not start automatic reads while disabled and discards the disabled generation', async () => {
    const old = pendingRead(), fresh = pendingRead()
    const list = vi.fn<() => Promise<CampusEvent[]>>()
      .mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise)
    const port = catalog(list)
    const { result, rerender } = renderHook(({ enabled }) => useCatalogEvents(port, enabled), { initialProps: { enabled: false } })
    expect(list).not.toHaveBeenCalled()
    rerender({ enabled: true })
    expect(list).toHaveBeenCalledTimes(1)
    rerender({ enabled: false })
    const disabled = result.current
    await act(async () => { old.resolve([first]) })
    expect(result.current).toBe(disabled)
    rerender({ enabled: true })
    expect(list).toHaveBeenCalledTimes(2)
    await act(async () => { fresh.resolve([second]) })
    expect(result.current).toMatchObject({ events: [second], error: null, loading: false })
  })
})
