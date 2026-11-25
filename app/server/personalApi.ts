// SERVER CONTROLLER: a signed-in student's own data under /api/me.
// Every call needs a live bearer token. The token is checked with Supabase Auth and then
// forwarded, so Row Level Security in the database decides what the caller can read or change.
// Validation repeats the database rules first, so a bad request never reaches Supabase.
import type { IncomingMessage, ServerResponse } from 'node:http'
import { AuthCheckLimitError, createVerifiedTokenGuard } from './verifiedTokens'
import {
  PersonalStoreError, checkBusyDraft, checkDisplayName, checkId, checkIdeaDraft, checkIdeaPatch,
  type PersonalStorePort,
} from '../src/model/personalData'

/** Turns a bearer token into the caller's user ID (null when not a live session) and their scoped store. */
export interface PersonalGateway {
  userFor(accessToken: string): Promise<string | null>
  storeFor(accessToken: string, userId: string): PersonalStorePort
}

export const MAX_PERSONAL_BYTES = 4096
export const PERSONAL_WRITES_PER_MINUTE = 120
const TOKEN_PATTERN = /^[A-Za-z0-9._~+/-]+=*$/

class MeHttpError extends Error {
  constructor(readonly status: number, message: string) { super(message) }
}

function json(res: ServerResponse, status: number, value: unknown) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, private',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  })
  res.end(status === 204 ? undefined : JSON.stringify(value))
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  if (!req.headers['content-type']?.toLowerCase().startsWith('application/json')) throw new MeHttpError(415, 'Send the request as JSON.')
  const chunks: Buffer[] = []
  let size = 0
  for await (const part of req) {
    size += Buffer.byteLength(part)
    if (size <= MAX_PERSONAL_BYTES) chunks.push(Buffer.isBuffer(part) ? part : Buffer.from(part))
  }
  if (size > MAX_PERSONAL_BYTES) throw new MeHttpError(413, 'The request is too large.')
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown }
  catch { throw new MeHttpError(400, 'Invalid request.') }
}

function bearer(req: IncomingMessage): string {
  const header = req.headers.authorization
  const token = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (token.length < 20 || token.length > 8192 || !TOKEN_PATTERN.test(token)) throw new MeHttpError(401, 'Sign in to see your saved things.')
  return token
}

const STATUS: Record<PersonalStoreError['kind'], number> = { invalid: 400, limit: 409, 'not-found': 404, 'signed-out': 401, unavailable: 503 }

export function createPersonalApi(gateway: PersonalGateway | null, clock: () => number = Date.now) {
  const sessions = createVerifiedTokenGuard(clock)
  const writes = new Map<string, { count: number; until: number }>()
  const countWrite = (userId: string) => {
    const now = clock()
    for (const [key, row] of writes) if (row.until <= now) writes.delete(key)
    const row = writes.get(userId) ?? { count: 0, until: now + 60_000 }
    if (row.count >= PERSONAL_WRITES_PER_MINUTE) throw new MeHttpError(429, 'Too many changes at once. Wait a minute and try again.')
    row.count++
    writes.set(userId, row)
  }

  return async function handle(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    let url: URL
    try { url = new URL(req.url ?? '/', 'http://sidequest.local') } catch { return false }
    if (url.pathname !== '/api/me' && !url.pathname.startsWith('/api/me/')) return false
    if (!gateway) { json(res, 503, { error: 'Accounts are not turned on for this server.' }); return true }
    try {
      const method = req.method ?? 'GET'
      const write = method !== 'GET'
      if (write) {
        // Bearer tokens are never sent automatically, but a stray cross-site write is still refused.
        const origin = req.headers.origin
        if (typeof origin === 'string') {
          let host = ''
          try { host = new URL(origin).host } catch { /* malformed origin is refused below */ }
          if (host !== req.headers.host) throw new MeHttpError(403, 'Use the SideQuest site to change your things.')
        }
      }
      const token = bearer(req)
      let userId: string | null
      try { userId = await sessions.check(req, token, t => gateway.userFor(t)) }
      catch (error) {
        if (error instanceof AuthCheckLimitError) throw new MeHttpError(429, error.message)
        throw new MeHttpError(503, 'The sign-in service is unavailable.')
      }
      if (!userId) throw new MeHttpError(401, 'Your session ended. Sign in again.')
      if (write) countWrite(userId)
      const store = gateway.storeFor(token, userId)
      const path = url.pathname.replace(/\/+$/, '')
      const id = url.searchParams.get('id')
      const route = `${method} ${path}`
      switch (route) {
        case 'GET /api/me': json(res, 200, await store.load()); break
        case 'GET /api/me/plans': json(res, 200, { plans: await store.listPlans() }); break
        case 'GET /api/me/someday': json(res, 200, { ideas: await store.listIdeas() }); break
        case 'GET /api/me/busy': json(res, 200, { busy: await store.listBusy() }); break
        case 'PUT /api/me/profile': json(res, 200, await store.setProfile(checkDisplayName(await readBody(req)))); break
        case 'POST /api/me/plans': {
          const data = await readBody(req) as Record<string, unknown> | null
          if (!data || typeof data !== 'object' || Object.keys(data).join() !== 'eventId') throw new MeHttpError(400, 'Send only eventId.')
          const eventId = checkId(data.eventId, 'event')
          await store.addPlan(eventId)
          json(res, 201, { eventId })
          break
        }
        case 'DELETE /api/me/plans': await store.removePlan(checkId(url.searchParams.get('eventId'), 'event')); json(res, 204, null); break
        case 'POST /api/me/someday': json(res, 201, await store.addIdea(checkIdeaDraft(await readBody(req)))); break
        case 'PATCH /api/me/someday': json(res, 200, await store.updateIdea(checkId(id, 'idea'), checkIdeaPatch(await readBody(req)))); break
        case 'DELETE /api/me/someday': await store.removeIdea(checkId(id, 'idea')); json(res, 204, null); break
        case 'POST /api/me/busy': json(res, 201, await store.addBusy(checkBusyDraft(await readBody(req)))); break
        case 'DELETE /api/me/busy': await store.removeBusy(checkId(id, 'busy time')); json(res, 204, null); break
        default: throw new MeHttpError(path.startsWith('/api/me') && ['/api/me', '/api/me/plans', '/api/me/someday', '/api/me/busy', '/api/me/profile'].includes(path) ? 405 : 404, 'Unknown request.')
      }
    } catch (error) {
      if (error instanceof MeHttpError) json(res, error.status, { error: error.message })
      else if (error instanceof PersonalStoreError) json(res, STATUS[error.kind], { error: error.message })
      else json(res, 503, { error: 'Your saved things are unavailable right now. Try again.' })
    }
    return true
  }
}
