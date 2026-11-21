// Bound read latency without changing EventCatalogPort or classifying slow
// responses as missing records. The port has no cancellation API: a late read
// may still finish, but cannot settle this result twice or alter saved plans.
export const CATALOG_READ_TIMEOUT_MS = 10_000

export class CatalogReadTimeoutError extends Error {
  constructor() {
    super('Loading events took too long. Please try again.')
    this.name = 'CatalogReadTimeoutError'
  }
}

export function readCatalogWithDeadline<T>(operation: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new CatalogReadTimeoutError()), CATALOG_READ_TIMEOUT_MS)
    try {
      operation().then(
        value => {
          clearTimeout(timer)
          resolve(value)
        },
        error => {
          clearTimeout(timer)
          reject(error)
        },
      )
    } catch (error) {
      clearTimeout(timer)
      reject(error)
    }
  })
}
