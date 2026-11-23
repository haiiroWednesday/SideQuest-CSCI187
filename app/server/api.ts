// HTTP Controller. Shared validation and persistence remain in Model.
import type { IncomingMessage, ServerResponse } from 'node:http'
import { EventCatalogError, DRAFT_FIELD_ORDER, type EventCatalogPort, type EventDraft } from '../src/model/eventCatalog'
import { readCatalogWithDeadline, CatalogReadTimeoutError } from '../src/controller/catalogReads'

export const MAX_POST_BYTES = 16_384
export const POSTS_PER_MINUTE = 20
class HttpError extends Error {
  status: number
  constructor(status: number, message: string) { super(message); this.status = status }
}

export function createCatalogApi(catalog: EventCatalogPort | null, clock: () => number = Date.now, publish?: (eventId: string) => void) {
  const limits = new Map<string, { count: number; until: number }>()
  const reply = (res: ServerResponse, status: number, value: unknown) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
    res.end(JSON.stringify(value))
  }
  async function draftFrom(req: IncomingMessage): Promise<EventDraft> {
    if (!req.headers['content-type']?.startsWith('application/json')) throw new HttpError(415, 'Send event details as JSON.')
    let size = 0
    const chunks: Buffer[] = []
    for await (const chunk of req) {
      size += Buffer.byteLength(chunk)
      if (size <= MAX_POST_BYTES) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    if (size > MAX_POST_BYTES) throw new HttpError(413, 'This event submission is too large.')
    let value: unknown
    try { value = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { throw new HttpError(400, 'Event details must be valid JSON.') }
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError(400, 'Provide an event object.')
    const data = value as Record<string, unknown>
    if (Object.keys(data).some(key => !(DRAFT_FIELD_ORDER as readonly string[]).includes(key)) || DRAFT_FIELD_ORDER.some(key => typeof data[key] !== 'string')) {
      throw new HttpError(400, 'Provide only the seven supported event fields. Event IDs are assigned by the catalog.')
    }
    return Object.fromEntries(DRAFT_FIELD_ORDER.map(key => [key, data[key]])) as EventDraft
  }
  return async function handle(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    let url: URL
    try { url = new URL(req.url ?? '/', 'http://sidequest.local') } catch { reply(res, 400, { error: 'Invalid request URL.' }); return true }
    if (!url.pathname.startsWith('/api/')) return false
    try {
      if (url.pathname === '/api/catalog' && req.method === 'GET') { reply(res, 200, { shared: catalog !== null }); return true }
      if (url.pathname !== '/api/events') throw new HttpError(404, 'Unknown catalog endpoint.')
      if (!['GET', 'POST'].includes(req.method ?? '')) throw new HttpError(405, 'Only reading and posting events are supported.')
      if (!catalog) throw new HttpError(503, 'The shared catalog is not configured on this server.')
      if (req.method === 'GET') {
        if ([...url.searchParams.keys()].some(key => key !== 'id')) throw new HttpError(400, 'Unsupported catalog query.')
        const id = url.searchParams.get('id')
        const data = id === null ? await readCatalogWithDeadline(() => catalog.listUpcoming()) : await readCatalogWithDeadline(() => catalog.getById(id))
        reply(res, 200, data)
      } else {
        const origin = req.headers.origin
        if (origin && new URL(origin).host !== req.headers.host) throw new HttpError(403, 'Post events from the SideQuest site.')
        const now = clock(), ip = req.socket.remoteAddress ?? 'unknown'
        for (const [key, value] of limits) if (value.until <= now) limits.delete(key)
        if (limits.size >= 10_000 && !limits.has(ip)) throw new HttpError(429, 'The catalog is busy. Please try again later.')
        const limit = limits.get(ip) ?? { count: 0, until: now + 60_000 }
        if (limit.count >= POSTS_PER_MINUTE) throw new HttpError(429, 'Too many event submissions. Wait a minute before trying again.')
        limit.count++; limits.set(ip, limit)
        const created = await catalog.create(await draftFrom(req))
        reply(res, 201, created)
        // Notifications are best-effort; confirmed writes are authoritative.
        try { publish?.(created.id) } catch { /* A manual refresh remains available. */ }
      }
    } catch (error) {
      if (error instanceof HttpError) reply(res, error.status, { error: error.message })
      else if (error instanceof CatalogReadTimeoutError) reply(res, 504, { error: error.message })
      else if (error instanceof EventCatalogError) reply(res, error.kind === 'invalid' ? 400 : 503, { error: error.message })
      else reply(res, 503, { error: 'The catalog is unavailable. Please try again.' })
    }
    return true
  }
}
