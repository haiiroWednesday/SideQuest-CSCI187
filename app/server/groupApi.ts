// HTTP CONTROLLER: an opt-in, bearer-authenticated gateway to caller-scoped
// group RPCs. This controller never accepts a client-supplied acting user ID.
import { createHash } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { MAX_GROUP_INVITEES, MAX_IF_CONDITION, ifConditionLength, type ResponseKind } from '../src/model/groupPlans'

export type VerifiedGroupActor = { userId: string }
export type GroupActionInput = {
  expectedRevision: number
  action: 'invite' | 'remove' | 'respond' | 'confirm' | 'cancel' | 'accept' | 'decline' | 'leave'
  inviteeId?: string | null
  response?: ResponseKind | null
  condition?: string | null
}

export interface AuthenticatedGroupGateway {
  verify(token: string): Promise<VerifiedGroupActor | null>
  list(token: string): Promise<unknown>
  create(token: string, eventId: string): Promise<unknown>
  read(token: string, planId: string): Promise<unknown>
  action(token: string, planId: string, input: GroupActionInput): Promise<unknown>
}

export class GroupGatewayError extends Error {
  constructor(readonly status: number, message: string) { super(message) }
}

const GROUP_MAX_BODY_BYTES = 8192
const GROUP_REQUESTS_PER_MINUTE = 40
const GROUP_AUTH_CHECKS_PER_MINUTE = 600
const GROUP_AUTH_RESERVED_CHECKS = 200
const GROUP_AUTH_HINT_LIFETIME_MS = 5 * 60_000
const MAX_TRACKED_GROUP_ACTORS = 10000
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const VALID_ACTIONS = new Set(['invite', 'remove', 'respond', 'confirm', 'cancel', 'accept', 'decline', 'leave'])
const VALID_RESPONSES: ReadonlySet<string> = new Set<ResponseKind>(['works', 'if', 'cant'])

class RequestError extends Error {
  constructor(readonly status: number, message: string) { super(message) }
}

type JsonObject = Record<string, unknown>
function object(value: unknown): JsonObject | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : null
}

function rejectUnknown(value: JsonObject, keys: readonly string[]): void {
  if (Object.keys(value).some(key => !keys.includes(key))) {
    throw new RequestError(400, 'Unsupported group request field.')
  }
}

function validatedAction(value: JsonObject): GroupActionInput {
  rejectUnknown(value, ['expectedRevision', 'action', 'inviteeId', 'response', 'condition'])
  if (!Number.isSafeInteger(value.expectedRevision) || Number(value.expectedRevision) < 0 ||
      typeof value.action !== 'string' || !VALID_ACTIONS.has(value.action)) {
    throw new RequestError(400, 'Provide a supported action and current revision.')
  }
  const input: GroupActionInput = {
    expectedRevision: value.expectedRevision as number,
    action: value.action as GroupActionInput['action'],
  }
  if (input.action === 'invite' || input.action === 'remove') {
    if (typeof value.inviteeId !== 'string' || !UUID.test(value.inviteeId) ||
        value.response !== undefined || value.condition !== undefined) {
      throw new RequestError(400, 'Choose a valid participant for this action.')
    }
    input.inviteeId = value.inviteeId
  } else if (input.action === 'respond') {
    if (value.inviteeId !== undefined || typeof value.response !== 'string' ||
        !VALID_RESPONSES.has(value.response)) {
      throw new RequestError(400, 'Choose Works, If, or Cannot.')
    }
    input.response = value.response as GroupActionInput['response']
    if (input.response === 'if') {
      if (value.condition !== undefined && value.condition !== null &&
          (typeof value.condition !== 'string' || ifConditionLength(value.condition) > MAX_IF_CONDITION)) {
        throw new RequestError(400, 'An optional If note must be text of up to 280 characters.')
      }
      input.condition = typeof value.condition === 'string' ? value.condition.trim() || null : null
    } else if (value.condition !== undefined && value.condition !== null) {
      throw new RequestError(400, 'Only If responses may include a condition.')
    }
  } else if (value.inviteeId !== undefined || value.response !== undefined || value.condition !== undefined) {
    throw new RequestError(400, 'This action does not accept participant or response fields.')
  }
  return input
}

// Defense in depth: even if a future RPC mistakenly returns another user's
// If note, the Node gateway exposes it to the plan's accepted members only.
type ExpectedPlan = { planId: string } | { eventId: string }

function projectPlan(raw: unknown, actorId: string, expected: ExpectedPlan): unknown {
  const plan = object(raw)
  if (!plan || typeof plan.id !== 'string' || typeof plan.eventId !== 'string' ||
      typeof plan.organizerId !== 'string' || !Number.isSafeInteger(plan.revision) ||
      !['proposed', 'confirmed', 'cancelled'].includes(String(plan.status)) ||
      !Array.isArray(plan.participants) || !Array.isArray(plan.invitations) ||
      plan.invitations.some((id: unknown) => typeof id !== 'string' || !UUID.test(id)) ||
      plan.participants.length + plan.invitations.length > MAX_GROUP_INVITEES) {
    throw new GroupGatewayError(503, 'The group response is unavailable.')
  }
  // A caller may belong to several plans; membership alone cannot establish
  // that the upstream returned the requested resource.
  if (('planId' in expected && plan.id.toLowerCase() !== expected.planId.toLowerCase()) ||
      ('eventId' in expected && (plan.eventId.toLowerCase() !== expected.eventId.toLowerCase() ||
        plan.organizerId !== actorId))) {
    throw new GroupGatewayError(503, 'The group response is unavailable.')
  }
  const organizer = plan.organizerId === actorId
  const member = organizer || plan.participants.some((entry: unknown) => object(entry)?.userId === actorId)
  const invited = plan.status === 'proposed' && plan.invitations.includes(actorId)
  if (!member && !invited) {
    // Defense in depth if a future SQL or transport bug returns another
    // account's group: do not expose its event, roster or metadata.
    throw new GroupGatewayError(404, 'Plan unavailable.')
  }
  return {
    id: plan.id, eventId: plan.eventId, organizerId: plan.organizerId,
    status: plan.status, revision: plan.revision,
    invitations: plan.status === 'proposed' ? plan.invitations.filter((id: string) => organizer || id === actorId) : [],
    participants: (member ? plan.participants : []).map((rawParticipant: unknown) => {
      const participant = object(rawParticipant)
      if (!participant || typeof participant.userId !== 'string' ||
          (participant.response !== null && !VALID_RESPONSES.has(String(participant.response)))) {
        throw new GroupGatewayError(503, 'The group response is unavailable.')
      }
      return {
        userId: participant.userId,
        response: participant.response,
        // If conditions are shared with accepted members; only an If answer carries one.
        ...(participant.userId === actorId || participant.response === 'if'
          ? { ifCondition: participant.response === 'if' && typeof participant.ifCondition === 'string'
              ? participant.ifCondition : null }
          : {}),
      }
    }),
  }
}

function projectList(raw: unknown): unknown {
  if (!Array.isArray(raw)) throw new GroupGatewayError(503, 'The group response is unavailable.')
  return raw.map(row => {
    const value = object(row)
    if (!value || typeof value.id !== 'string' || typeof value.eventId !== 'string' ||
        typeof value.organizerId !== 'string' || !Number.isSafeInteger(value.revision) ||
        !['proposed', 'confirmed', 'cancelled'].includes(String(value.status))) {
      throw new GroupGatewayError(503, 'The group response is unavailable.')
    }
    return {
      id: value.id, eventId: value.eventId, organizerId: value.organizerId,
      status: value.status, revision: value.revision,
    }
  })
}

function response(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  })
  res.end(JSON.stringify(data))
}

async function jsonBody(req: IncomingMessage): Promise<JsonObject> {
  if (req.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    throw new RequestError(415, 'Send group details as JSON.')
  }
  let size = 0
  const chunks: Buffer[] = []
  const declared = Number(req.headers['content-length'])
  if (declared > GROUP_MAX_BODY_BYTES) throw new RequestError(413, 'Group request is too large.')
  // Stop reading immediately rather than draining attacker-controlled input.
  // The error response closes the connection after delivering HTTP 413.
  for await (const part of req.iterator({ destroyOnReturn: false })) {
    size += Buffer.byteLength(part)
    if (size > GROUP_MAX_BODY_BYTES) throw new RequestError(413, 'Group request is too large.')
    chunks.push(Buffer.isBuffer(part) ? part : Buffer.from(part))
  }
  let value: unknown
  try { value = JSON.parse(Buffer.concat(chunks).toString('utf8')) }
  catch { throw new RequestError(400, 'Group details must be valid JSON.') }
  const data = object(value)
  if (!data) throw new RequestError(400, 'Provide a group request object.')
  return data
}

export function createGroupApi(
  gateway: AuthenticatedGroupGateway | null,
  clock: () => number = Date.now,
) {
  const limits = new Map<string, { count: number; until: number }>()
  // A token digest is an admission hint, never a cached authorization decision.
  // Auth and the caller-scoped RPC must still verify every admitted request.
  const verifiedHints = new Map<string, { userId: string; until: number }>()
  let authBudget = { count: 0, until: 0 }

  function consumeAccountQuota(userId: string, now: number): void {
    for (const [key, item] of limits) if (item.until <= now) limits.delete(key)
    if (limits.size >= MAX_TRACKED_GROUP_ACTORS && !limits.has(userId)) {
      throw new RequestError(429, 'The group service is busy.')
    }
    const limit = limits.get(userId) ?? { count: 0, until: now + 60000 }
    if (limit.count >= GROUP_REQUESTS_PER_MINUTE) throw new RequestError(429, 'Too many group requests.')
    limit.count++
    limits.set(userId, limit)
  }

  function rememberVerifiedToken(digest: string, userId: string, now: number): void {
    if (verifiedHints.size >= MAX_TRACKED_GROUP_ACTORS) {
      for (const [key, hint] of verifiedHints) {
        if (hint.until <= now) verifiedHints.delete(key)
      }
    }
    if (verifiedHints.size < MAX_TRACKED_GROUP_ACTORS || verifiedHints.has(digest)) {
      verifiedHints.set(digest, { userId, until: now + GROUP_AUTH_HINT_LIFETIME_MS })
    }
  }

  async function verifyAdmittedToken(
    activeGateway: AuthenticatedGroupGateway, token: string, now: number,
  ): Promise<VerifiedGroupActor> {
    const digest = createHash('sha256').update(token).digest('hex')
    const hint = verifiedHints.get(digest)
    if (hint && hint.until <= now) verifiedHints.delete(digest)
    const knownActor = verifiedHints.get(digest)?.userId

    if (authBudget.until <= now) authBudget = { count: 0, until: now + 60000 }
    const generalBudget = GROUP_AUTH_CHECKS_PER_MINUTE - GROUP_AUTH_RESERVED_CHECKS
    // Reserve part of the existing total for recently verified tokens. Unseen
    // tokens cannot consume that reserve, even when all traffic shares a proxy.
    if (authBudget.count >= GROUP_AUTH_CHECKS_PER_MINUTE ||
        (!knownActor && authBudget.count >= generalBudget)) {
      throw new RequestError(429, 'The group service is busy.')
    }
    // Charge a known account before awaiting Auth, including concurrent calls.
    // The hint only selects the quota; it cannot grant access.
    if (knownActor) consumeAccountQuota(knownActor, now)
    authBudget.count++

    const actor = await activeGateway.verify(token)
    if (!actor?.userId || !UUID.test(actor.userId) ||
        (knownActor && knownActor !== actor.userId)) {
      verifiedHints.delete(digest)
      throw new RequestError(401, 'Your group session is not valid.')
    }
    if (!knownActor) consumeAccountQuota(actor.userId, clock())
    rememberVerifiedToken(digest, actor.userId, clock())
    return actor
  }

  return async (req: IncomingMessage, res: ServerResponse): Promise<boolean> => {
    let pathname: string
    try { pathname = new URL(req.url ?? '/', 'http://sidequest.local').pathname }
    catch { return false }
    if (!(pathname === '/api/groups' || pathname.startsWith('/api/groups/'))) return false
    if (!gateway) { response(res, 503, { error: 'Group planning is not enabled.' }); return true }

    try {
      const match = /^\/api\/groups(?:\/([0-9a-f-]{36})(\/actions)?)?$/i.exec(pathname)
      if (!match || (match[1] && !UUID.test(match[1]))) {
        throw new RequestError(404, 'Unknown group endpoint.')
      }

      const method = req.method ?? ''
      const isRoot = !match[1]
      const isAction = match[2] === '/actions'
      if (!((isRoot && ['GET','POST'].includes(method)) ||
          (!isRoot && !isAction && method === 'GET') ||
          (!isRoot && isAction && method === 'POST'))) {
        throw new RequestError(405, 'Unsupported group request method.')
      }

      if (method === 'POST') {
        let sameOrigin = false
        try {
          const origin = new URL(req.headers.origin ?? '')
          sameOrigin = ['http:', 'https:'].includes(origin.protocol) &&
            origin.host === req.headers.host && !origin.username && !origin.password
        } catch { /* missing or malformed Origin is denied */ }
        if (!sameOrigin) throw new RequestError(403, 'Use the SideQuest site for group changes.')
      }

      const auth = req.headers.authorization
      const token = typeof auth === 'string' && auth.length <= 8200
        ? /^Bearer ([A-Za-z0-9._~-]{20,8192})$/.exec(auth)?.[1] : undefined
      if (!token) throw new RequestError(401, 'Sign in before accessing group plans.')

      // Confirm the identity with Auth *before* calling any private RPC.
      const actor = await verifyAdmittedToken(gateway, token, clock())

      if (isRoot && method === 'GET') {
        response(res, 200, projectList(await gateway.list(token)))
      } else if (isRoot) {
        const body = await jsonBody(req)
        rejectUnknown(body, ['eventId'])
        if (typeof body.eventId !== 'string' || !UUID.test(body.eventId)) {
          throw new RequestError(400, 'Choose a valid campus event.')
        }
        response(res, 201, projectPlan(await gateway.create(token, body.eventId), actor.userId, { eventId: body.eventId }))
      } else if (isAction) {
        const body = await jsonBody(req)
        const command = validatedAction(body)
        const updated = await gateway.action(token, match[1], command)
        if (command.action === 'decline' || command.action === 'leave') {
          if (updated !== null) throw new GroupGatewayError(503, 'The group response is unavailable.')
          response(res, 200, null)
        } else {
          response(res, 200, projectPlan(updated, actor.userId, { planId: match[1] }))
        }
      } else {
        response(res, 200, projectPlan(await gateway.read(token, match[1]), actor.userId, { planId: match[1] }))
      }
    } catch (error) {
      const status = error instanceof RequestError || error instanceof GroupGatewayError
        ? error.status : 503
      const message = error instanceof RequestError || error instanceof GroupGatewayError
        ? error.message : 'Group planning is unavailable.'
      if (status === 413) {
        req.pause()
        res.setHeader('Connection', 'close')
        res.once('finish', () => req.destroy())
      }
      response(res, status, { error: message })
    }
    return true
  }
}
