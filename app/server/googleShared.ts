// SERVER-ONLY helpers shared by the Google Calendar and Google Routes
// controllers: JSON replies, bounded JSON bodies, same-origin checks, bearer
// tokens and a small per-key rate limiter. Nothing here reads an environment
// variable or talks to Google.
import type { IncomingMessage, ServerResponse } from 'node:http'

export class GoogleHttpError extends Error {
  constructor(readonly status: number, message: string, readonly code = 'error') { super(message) }
}

export const NOT_ENABLED = 'not_enabled'
const MAX_BYTES = 4096

export function sendJson(res: ServerResponse, status: number, value: unknown): void {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, private',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
  })
  res.end(JSON.stringify(value))
}

export function sendError(res: ServerResponse, error: unknown, fallback: string): void {
  if (error instanceof GoogleHttpError) sendJson(res, error.status, { error: error.message, code: error.code })
  else sendJson(res, 503, { error: fallback, code: 'unavailable' })
}

/** Redirects inside SideQuest only. The target is always a fixed hash route. */
export function redirectHome(res: ServerResponse, hash: string): void {
  res.writeHead(303, {
    Location: '/#' + hash,
    'Cache-Control': 'no-store, private',
    'Referrer-Policy': 'no-referrer',
  })
  res.end()
}

export async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  if (!req.headers['content-type']?.toLowerCase().startsWith('application/json')) {
    throw new GoogleHttpError(415, 'Send the request as JSON.')
  }
  const chunks: Buffer[] = []
  let size = 0
  for await (const part of req) {
    size += Buffer.byteLength(part)
    if (size <= MAX_BYTES) chunks.push(Buffer.isBuffer(part) ? part : Buffer.from(part))
  }
  if (size > MAX_BYTES) throw new GoogleHttpError(413, 'The request is too large.')
  let parsed: unknown
  try { parsed = JSON.parse(Buffer.concat(chunks).toString('utf8')) }
  catch { throw new GoogleHttpError(400, 'Invalid request.') }
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new GoogleHttpError(400, 'Invalid request.')
  }
  return parsed as Record<string, unknown>
}

/** Every state-changing call must come from a SideQuest page on this host. */
export function requireSameOrigin(req: IncomingMessage): void {
  const origin = req.headers.origin
  let host = ''
  try { host = typeof origin === 'string' ? new URL(origin).host : '' }
  catch { host = '' }
  if (!host || host !== req.headers.host) {
    throw new GoogleHttpError(403, 'Use the SideQuest site for this.')
  }
}

export function bearer(req: IncomingMessage): string | null {
  const value = req.headers.authorization
  if (typeof value !== 'string' || !value.startsWith('Bearer ')) return null
  const token = value.slice(7).trim()
  return token.length >= 20 && token.length <= 8192 ? token : null
}

export function createRateLimiter(max: number, windowMs: number, clock: () => number) {
  const counters = new Map<string, { count: number; until: number }>()
  return (key: string) => {
    const now = clock()
    for (const [id, row] of counters) if (row.until <= now) counters.delete(id)
    if (counters.size >= 10_000 && !counters.has(key)) {
      throw new GoogleHttpError(429, 'Too many requests. Try again in a minute.')
    }
    const row = counters.get(key) ?? { count: 0, until: now + windowMs }
    if (row.count >= max) throw new GoogleHttpError(429, 'Too many requests. Try again in a minute.')
    row.count++
    counters.set(key, row)
  }
}

export function pathOf(req: IncomingMessage): URL | null {
  try { return new URL(req.url ?? '/', 'http://sidequest.local') }
  catch { return null }
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

/** Adds a deadline so a slow Google reply never hangs a SideQuest request. */
export function withDeadline(fetchImpl: FetchLike, ms = 10_000): FetchLike {
  return (input, init) => fetchImpl(input, {
    ...init,
    signal: AbortSignal.any([...(init?.signal ? [init.signal] : []), AbortSignal.timeout(ms)]),
  })
}
