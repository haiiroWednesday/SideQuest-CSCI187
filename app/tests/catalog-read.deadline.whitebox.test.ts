import { afterEach, describe, expect, it, vi } from 'vitest'
import { CATALOG_READ_TIMEOUT_MS, CatalogReadTimeoutError, readCatalogWithDeadline } from '../src/controller/catalogReads'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

afterEach(() => { vi.useRealTimers() })

describe('catalog read deadline: control flow and competing completions', () => {
  it('returns a successful read immediately before the deadline and clears its timer', async () => {
    vi.useFakeTimers()
    const read = deferred<string>()
    const result = readCatalogWithDeadline(() => read.promise)
    await vi.advanceTimersByTimeAsync(CATALOG_READ_TIMEOUT_MS - 1)
    read.resolve('authoritative record')
    await expect(result).resolves.toBe('authoritative record')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('preserves an asynchronous provider rejection and clears its timer', async () => {
    vi.useFakeTimers()
    const failure = new Error('provider unavailable')
    const result = readCatalogWithDeadline(() => Promise.reject(failure))
    await expect(result).rejects.toBe(failure)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('preserves a synchronous provider exception and clears its timer', async () => {
    vi.useFakeTimers()
    const failure = new Error('provider threw synchronously')
    const result = readCatalogWithDeadline(() => { throw failure })
    await expect(result).rejects.toBe(failure)
    expect(vi.getTimerCount()).toBe(0)
  })

  it.each(['resolve', 'reject'] as const)('times out at the boundary and ignores a late %s', async outcome => {
    vi.useFakeTimers()
    const read = deferred<string>()
    const settled = vi.fn()
    const result = readCatalogWithDeadline(() => read.promise)
    // Attach both handlers before advancing the clock so no rejection is unhandled.
    const observed = result.then(
      value => { settled('fulfilled', value) },
      error => { settled('rejected', error) },
    )
    await vi.advanceTimersByTimeAsync(CATALOG_READ_TIMEOUT_MS - 1)
    expect(settled).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    await observed
    expect(settled).toHaveBeenCalledTimes(1)
    expect(settled).toHaveBeenCalledWith('rejected', expect.any(CatalogReadTimeoutError))
    if (outcome === 'resolve') read.resolve('late record')
    else read.reject(new Error('late provider rejection'))
    await vi.advanceTimersByTimeAsync(0)
    expect(settled).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })
})
