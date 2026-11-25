// SERVER CONTROLLER (stub, flag off): open invites and finding a time for a circle.
// Flag SIDEQUEST_SOCIAL_ENABLED is false by default, and then every /api/social/* answers 404 "not enabled".
// The rules are the same pure functions the app uses (src/controller/socialPlans). Storage is a port:
// the in-memory adapter here backs the tests; the Supabase adapter would call the review-only
// functions in supabase/proposals/20261125030000_open_invites_REVIEW_ONLY.sql once Daven approves them.
// Never stores or accepts a location. Free time is start and end only; others get only the overlap.
import type { IncomingMessage, ServerResponse } from 'node:http'
import { AuthCheckLimitError, createVerifiedTokenGuard } from './verifiedTokens'
import {
  commonTime, inviteErrors, join, joinBlock, leaveInvite, makeInvite, callOff, canMakePlan, markPlanned, visibleInvites,
  cleanSlots, type FreeShare, type OpenInvite, type SocialGroup, type Slot,
} from '../src/controller/socialPlans'

export interface SocialStorePort {
  userFor(token: string): Promise<string | null>
  groups(): Promise<SocialGroup[]>
  invites(): Promise<OpenInvite[]>
  saveInvite(invite: OpenInvite): Promise<void>
  shares(): Promise<FreeShare[]>
  /** Your own free time, start and end only. */
  setFree(person: string, slots: Slot[]): Promise<void>
  free(person: string): Promise<Slot[]>
  setSharing(person: string, groupId: string, on: boolean): Promise<void>
}

const MAX_BYTES = 8192
const TOKEN = /^[A-Za-z0-9._~+/-]+=*$/
class SocialHttpError extends Error { constructor(readonly status: number, message: string) { super(message) } }

function json(res: ServerResponse, status: number, value: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store, private', 'X-Content-Type-Options': 'nosniff' })
  res.end(JSON.stringify(value))
}
async function body(req: IncomingMessage): Promise<Record<string, unknown>> {
  if (!req.headers['content-type']?.toLowerCase().startsWith('application/json')) throw new SocialHttpError(415, 'Send the request as JSON.')
  const chunks: Buffer[] = []; let size = 0
  for await (const part of req) { size += Buffer.byteLength(part); if (size <= MAX_BYTES) chunks.push(Buffer.isBuffer(part) ? part : Buffer.from(part)) }
  if (size > MAX_BYTES) throw new SocialHttpError(413, 'The request is too large.')
  let v: unknown
  try { v = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { throw new SocialHttpError(400, 'Invalid request.') }
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new SocialHttpError(400, 'Invalid request.')
  return v as Record<string, unknown>
}
const str = (v: unknown) => (typeof v === 'string' ? v : '')
const ALLOWED_INVITE = ['title', 'place', 'eventId', 'date', 'start', 'end', 'groupIds']

export function createSocialApi(store: SocialStorePort | null, clock: () => Date = () => new Date()) {
  const sessions = createVerifiedTokenGuard(() => clock().getTime())
  return async function socialApi(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    let url: URL
    // A malformed request line (for example "GET //[") must not throw out of the server.
    try { url = new URL(req.url ?? '/', 'http://local') } catch { return false }
    if (!url.pathname.startsWith('/api/social/')) return false
    if (url.pathname === '/api/social/status') { json(res, 200, { enabled: Boolean(store) }); return true }
    if (!store) { json(res, 404, { error: 'not_enabled' }); return true }
    try {
      if (req.method !== 'GET') {
        const origin = req.headers.origin
        let host = ''
        try { host = typeof origin === 'string' ? new URL(origin).host : '' } catch { /* refused below */ }
        if (!host || host !== req.headers.host) throw new SocialHttpError(403, 'Use the SideQuest site.')
      }
      const header = req.headers.authorization
      const token = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7).trim() : ''
      if (token.length < 20 || token.length > 8192 || !TOKEN.test(token)) throw new SocialHttpError(401, 'Sign in first.')
      let me: string | null
      try { me = await sessions.check(req, token, t => store.userFor(t)) }
      catch (error) {
        if (error instanceof AuthCheckLimitError) throw new SocialHttpError(429, error.message)
        throw error
      }
      if (!me) throw new SocialHttpError(401, 'Sign in first.')
      const now = clock(), groups = await store.groups()
      const parts = url.pathname.split('/').filter(Boolean) // api, social, ...

      if (req.method === 'GET' && url.pathname === '/api/social/invites') {
        json(res, 200, { invites: visibleInvites(await store.invites(), me, groups, now) })
        return true
      }
      if (req.method === 'POST' && url.pathname === '/api/social/invites') {
        const b = await body(req)
        if (Object.keys(b).some(k => !ALLOWED_INVITE.includes(k))) throw new SocialHttpError(400, 'Unknown field.')
        const draft = { title: str(b.title), place: str(b.place) || undefined, eventId: str(b.eventId) || undefined,
          date: str(b.date), start: str(b.start), end: str(b.end),
          groupIds: Array.isArray(b.groupIds) ? b.groupIds.filter((x): x is string => typeof x === 'string').slice(0, 20) : [] }
        const errors = inviteErrors(draft, me, groups, now)
        if (Object.keys(errors).length) { json(res, 400, { errors }); return true }
        const invite = makeInvite(draft, me, crypto.randomUUID())
        await store.saveInvite(invite)
        json(res, 201, { invite })
        return true
      }
      if (req.method === 'POST' && parts[2] === 'invites' && parts.length === 5) {
        const invite = (await store.invites()).find(i => i.id === parts[3])
        // Not found and not yours look the same: no hint that an invite exists.
        if (!invite || !(invite.by === me || visibleInvites([invite], me, groups, now).length)) throw new SocialHttpError(404, 'No such invite.')
        let next = invite
        if (parts[4] === 'join') {
          const why = joinBlock(invite, me, groups, now)
          if (why) throw new SocialHttpError(409, why)
          next = join(invite, me, groups, now)
        } else if (parts[4] === 'leave') next = leaveInvite(invite, me)
        else if (parts[4] === 'call-off') {
          if (invite.by !== me) throw new SocialHttpError(403, 'Only the sender can call it off.')
          next = callOff(invite, me)
        } else if (parts[4] === 'plan') {
          const b = await body(req)
          const groupId = str(b.groupId)
          if (!canMakePlan(invite, me, now) || !invite.groupIds.includes(groupId)) throw new SocialHttpError(409, 'Needs someone in, in one of its groups.')
          next = markPlanned(invite, groupId)
        } else throw new SocialHttpError(404, 'Unknown action.')
        await store.saveInvite(next)
        json(res, 200, { invite: next })
        return true
      }
      if (req.method === 'PUT' && url.pathname === '/api/social/free') {
        const b = await body(req)
        if (Object.keys(b).join() !== 'slots' || !Array.isArray(b.slots)) throw new SocialHttpError(400, 'Send free stretches only.')
        // Anything but date, start and end is dropped by cleanSlots: titles never reach storage.
        await store.setFree(me, cleanSlots(b.slots.slice(0, 200).map(x => ({ date: str((x as Slot)?.date), start: str((x as Slot)?.start), end: str((x as Slot)?.end) })), now))
        json(res, 200, { ok: true })
        return true
      }
      if (req.method === 'PUT' && parts[2] === 'groups' && parts[4] === 'sharing' && parts.length === 5) {
        const b = await body(req)
        if (typeof b.on !== 'boolean') throw new SocialHttpError(400, 'Say on or off.')
        if (!groups.some(g => g.id === parts[3] && !g.inviteFrom && g.members.includes(me))) throw new SocialHttpError(404, 'No such group.')
        await store.setSharing(me, parts[3], b.on)
        json(res, 200, { ok: true })
        return true
      }
      if (req.method === 'GET' && parts[2] === 'groups' && parts[4] === 'common' && parts.length === 5) {
        const g = groups.find(x => x.id === parts[3] && !x.inviteFrom && x.members.includes(me))
        if (!g) throw new SocialHttpError(404, 'No such group.')
        // Only the overlap and who shared: never anyone's own windows.
        const c = commonTime(g, await store.shares(), me, now)
        json(res, 200, c)
        return true
      }
      throw new SocialHttpError(404, 'Not found.')
    } catch (e) {
      if (e instanceof SocialHttpError) json(res, e.status, { error: e.message })
      else json(res, 503, { error: 'Open invites are unavailable right now.' })
      return true
    }
  }
}

/** In-memory store for tests and local review. Sharing is per group; the shares list joins it with free time. */
export function createMemorySocialStore(groups: SocialGroup[], tokens: Record<string, string>): SocialStorePort {
  const invites = new Map<string, OpenInvite>()
  const free = new Map<string, Slot[]>()
  const sharing = new Set<string>()
  return {
    async userFor(t) { return tokens[t] ?? null },
    async groups() { return groups },
    async invites() { return [...invites.values()] },
    async saveInvite(i) { invites.set(i.id, i) },
    async setFree(p, s) { free.set(p, s) },
    async free(p) { return free.get(p) ?? [] },
    async setSharing(p, g, on) { if (on) sharing.add(p + '\u0000' + g); else sharing.delete(p + '\u0000' + g) },
    async shares() {
      return [...sharing].map(k => { const [person, groupId] = k.split('\u0000'); return { person, groupId, slots: free.get(person) ?? [] } })
    },
  }
}

/** The server's wiring. Stays off (every route answers "not enabled") until the review-only SQL is
 *  approved and a Supabase adapter for SocialStorePort exists; the flag alone cannot turn on a memory store. */
export function createSocialApiFromEnv(_env: Record<string, string | undefined>) {
  return createSocialApi(null)
}
