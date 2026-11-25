import type { CatalogPublisherPort } from '../src/model/catalogChanged'
import {
  campusNow, compareEvents, EventCatalogError, isUpcoming, validateCatalogDraft,
  type CampusEvent, type EventCatalogPort,
} from '../src/model/eventCatalog'
import { isScuCalendarId, scuCalendarId } from '../src/model/scuCalendarId'

export const SCU_CALENDAR_FEED = 'https://events.scu.edu/live/json/v2/events/end_date/%2B45%20days/response_fields/location,group_title,status'
const SCU_ORIGIN = 'https://events.scu.edu'
const REFRESH_MS = 5 * 60_000
const MAX_SNAPSHOT_AGE_MS = 15 * 60_000
const MAX_PAGES = 12
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00(?:Z|[+-]\d{2}:\d{2})$/

type Fields = Record<string, unknown>
type FeedPage = { pages: number; rows: unknown[] }

function fields(value: unknown): Fields {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Fields : {}
}

const entities: Record<string, string> = {
  amp: '&', apos: "'", quot: '"', nbsp: ' ', lt: '<', gt: '>',
  ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
}

function plainText(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.replace(/<[^>]*>/g, ' ').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, name: string) => {
    if (!name.startsWith('#')) return Object.hasOwn(entities, name) ? entities[name] : entity
    const code = name[1].toLowerCase() === 'x' ? Number.parseInt(name.slice(2), 16) : Number(name.slice(1))
    return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : entity
  }).replace(/\s+/g, ' ').trim()
}

function officialOccurrence(row: Fields): { id: string; source: URL } | null {
  const sourceId = row.id
  if (typeof sourceId !== 'number' || !Number.isSafeInteger(sourceId) || sourceId <= 0 || sourceId > 0xffffffffffff) return null
  if (typeof row.url !== 'string') return null
  let source: URL
  try { source = new URL(row.url) } catch { return null }
  // LiveWhale sometimes lists a mirrored row with a different ID from the linked listing.
  const linkedId = /\/(?:event|events)\/(\d+)(?:[-/]|$)/.exec(source.pathname)?.[1]
  if (source.origin !== SCU_ORIGIN || source.username || source.password || linkedId !== String(sourceId)) return null
  source.search = ''
  source.hash = ''
  return { id: scuCalendarId(sourceId), source }
}

function eventFrom(row: Fields, id: string, source: URL): CampusEvent | null {
  if (row.status !== 1 || row.is_all_day || row.is_canceled || row.is_online) return null
  if (typeof row.date_iso !== 'string' || typeof row.date2_iso !== 'string' ||
      !TIMESTAMP.test(row.date_iso) || !TIMESTAMP.test(row.date2_iso)) return null
  const startsAt = new Date(row.date_iso), endsAt = new Date(row.date2_iso)
  if (!Number.isFinite(+startsAt) || !Number.isFinite(+endsAt) || endsAt <= startsAt) return null
  const start = campusNow(startsAt), end = campusNow(endsAt)
  if (start.date !== end.date) return null
  const result = validateCatalogDraft({
    title: plainText(row.title), hostName: plainText(row.group_title), location: plainText(row.location),
    description: `See the official SCU listing for event details and any registration requirements.\nSource: ${source.href}`,
    date: start.date, start: start.time, end: end.time,
  })
  return result.draft ? { id, ...result.draft } : null
}

async function fetchSnapshot(fetcher: typeof fetch): Promise<Map<string, CampusEvent>> {
  const signal = AbortSignal.timeout(8_000)
  async function read(page: number): Promise<FeedPage> {
    const response = await fetcher(`${SCU_CALENDAR_FEED}?page=${page}`, {
      redirect: 'error', headers: { Accept: 'application/json' }, signal,
    })
    if (!response.ok) throw new Error(`SCU calendar returned HTTP ${response.status}`)
    const body = fields(await response.json()), meta = fields(body.meta)
    const pages = meta.total_pages
    if (meta.type !== 'events' || !Array.isArray(body.data) || meta.page !== page ||
        typeof pages !== 'number' || !Number.isInteger(pages) || pages < 0 || pages > MAX_PAGES) {
      throw new Error('Unexpected SCU calendar response')
    }
    return { pages, rows: body.data }
  }

  const first = await read(1)
  const rest = await Promise.all(Array.from({ length: Math.max(0, first.pages - 1) }, (_, index) => read(index + 2)))
  if (rest.some(page => page.pages !== first.pages)) throw new Error('SCU calendar changed during pagination')
  const events = new Map<string, CampusEvent>()
  const ambiguous = new Set<string>()
  for (const value of [first, ...rest].flatMap(page => page.rows)) {
    const row = fields(value), occurrence = officialOccurrence(row)
    if (!occurrence) continue
    const { id, source } = occurrence
    const event = eventFrom(row, id, source)
    if (!event || (events.has(id) && JSON.stringify(events.get(id)) !== JSON.stringify(event))) {
      // A cancellation or reused ID wins over a competing eligible row.
      events.delete(id)
      ambiguous.add(id)
    } else if (!ambiguous.has(id)) events.set(id, event)
  }
  return events
}

export function createScuCalendarCatalog(posted: EventCatalogPort, publisher: CatalogPublisherPort, {
  fetcher = fetch, clock = Date.now,
}: { fetcher?: typeof fetch; clock?: () => number } = {}) {
  let snapshot: { events: Map<string, CampusEvent>; at: number } | undefined
  let published = new Map<string, CampusEvent>()
  let pending: Promise<void> | undefined

  const current = () => snapshot && clock() - snapshot.at < MAX_SNAPSHOT_AGE_MS ? snapshot.events : undefined

  function refresh() {
    if (pending) return pending
    pending = (async () => {
      try {
        const events = await fetchSnapshot(fetcher)
        snapshot = { events, at: clock() }
      } catch (error) {
        console.warn('Could not refresh the SCU calendar:', error instanceof Error ? error.message : 'unknown error')
      }
      const next = current() ?? new Map<string, CampusEvent>()
      const ids = new Set([...published.keys(), ...next.keys()])
      const changed = [...ids].find(id => JSON.stringify(published.get(id)) !== JSON.stringify(next.get(id)))
      published = next
      if (changed) {
        // A notification tells clients to re-read the entire catalog.
        try { publisher.publish(changed) } catch { /* A failed broadcast cannot discard a valid snapshot. */ }
      }
    })().finally(() => { pending = undefined })
    return pending
  }

  const catalog: EventCatalogPort = {
    create: draft => posted.create(draft),
    async listUpcoming() {
      const [postedEvents] = await Promise.all([posted.listUpcoming(), pending && !snapshot ? pending : undefined])
      const now = new Date(clock())
      const official = [...(current()?.values() ?? [])].filter(event => isUpcoming(event, now))
      return [...postedEvents, ...official].sort(compareEvents)
    },
    async getById(id) {
      if (!isScuCalendarId(id)) return posted.getById(id)
      if (pending && !snapshot) await pending
      const events = current()
      if (!events) throw new EventCatalogError('unavailable', 'SCU calendar details are temporarily unavailable. Please try again.')
      return events.get(id.toLowerCase()) ?? null
    },
  }

  return {
    catalog,
    refresh,
    start() {
      void refresh()
      const interval = setInterval(() => { void refresh() }, REFRESH_MS)
      interval.unref()
      return () => clearInterval(interval)
    },
  }
}

export function withScuCalendar(posted: EventCatalogPort | null, enabled: unknown, publisher: CatalogPublisherPort) {
  if (!posted || enabled !== 'true') return { catalog: posted, stop: undefined }
  const live = createScuCalendarCatalog(posted, publisher)
  return { catalog: live.catalog, stop: live.start() }
}
