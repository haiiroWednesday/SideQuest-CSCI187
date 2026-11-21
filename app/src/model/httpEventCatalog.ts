// Same-origin port. Database credentials and SDK calls stay in the Node server.
import {
  EventCatalogError,
  isCatalogEvent,
  isCatalogId,
  postingDraftErrors,
  firstFieldError,
  type CampusEvent,
  type EventCatalogPort,
} from './eventCatalog'

export function createHttpEventCatalog(
  fetcher: typeof fetch = (...args) => fetch(...args),
): EventCatalogPort {
  async function request(path: string, init?: RequestInit): Promise<unknown> {
    let response: Response
    try {
      response = await fetcher(path, {
        ...init,
        credentials: 'same-origin',
        signal: AbortSignal.timeout(25_000),
      })
    } catch {
      throw new EventCatalogError(
        'unavailable',
        init?.method === 'POST'
          ? 'Could not confirm this post. Check Discover before trying again.'
          : 'Could not load events. Please try again.',
      )
    }
    let data: unknown
    try {
      data = await response.json()
    } catch {
      throw new EventCatalogError(
        'unavailable',
        'The catalog returned an unreadable response. Please try again.',
      )
    }
    if (!response.ok) {
      const error =
        typeof data === 'object' &&
        data !== null &&
        'error' in data &&
        typeof data.error === 'string'
          ? data.error
          : 'The catalog is unavailable. Please try again.'
      throw new EventCatalogError(response.status === 400 ? 'invalid' : 'unavailable', error)
    }
    return data
  }
  function valid(data: unknown): CampusEvent {
    if (!isCatalogEvent(data))
      throw new EventCatalogError(
        'unavailable',
        'The catalog returned invalid event details. Please try again.',
      )
    return data
  }
  return {
    async create(draft) {
      const error = firstFieldError(postingDraftErrors(draft))
      if (error) throw new EventCatalogError('invalid', error)
      return valid(
        await request('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draft),
        }),
      )
    },
    async listUpcoming() {
      const data = await request('/api/events')
      if (!Array.isArray(data))
        throw new EventCatalogError(
          'unavailable',
          'The catalog returned an invalid event list. Please try again.',
        )
      return data.map(valid)
    },
    async getById(id) {
      if (!isCatalogId(id)) return null
      const data = await request(`/api/events?id=${encodeURIComponent(id)}`)
      if (data === null) return null
      const event = valid(data)
      if (event.id !== id)
        throw new EventCatalogError(
          'unavailable',
          'The catalog returned the wrong event. Please try again.',
        )
      return event
    },
  }
}
