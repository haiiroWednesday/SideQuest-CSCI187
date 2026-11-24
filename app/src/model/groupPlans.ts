// MODEL: deterministic collaboration rules. This module cannot authenticate anyone.
// A trusted server must derive actorId from a verified session, persist revisions
// atomically, and enforce read permissions before exposing plans or private notes.

export type ResponseKind = 'works' | 'if' | 'cant'
export type PlanStatus = 'proposed' | 'confirmed' | 'cancelled'

export type Participant = {
  userId: string
  response: ResponseKind | null
  privateCondition: string | null
}

export type PendingInvitation = { userId: string; expiresAt: number }

export type GroupPlan = {
  id: string
  eventId: string
  organizerId: string
  status: PlanStatus
  revision: number
  participants: Participant[]
  invitations: PendingInvitation[]
}

export type PlanCommand =
  | { type: 'invite'; userId: string }
  | { type: 'remove'; userId: string }
  | { type: 'accept' | 'decline' | 'leave' }
  | { type: 'respond'; response: ResponseKind; privateCondition?: string | null }
  | { type: 'confirm' }
  | { type: 'cancel' }

export type RuleFailure = 'invalid' | 'forbidden' | 'stale' | 'conflict'
export type RuleResult =
  | { ok: true; plan: GroupPlan }
  | { ok: false; reason: RuleFailure; message: string }

export type PlanViewer = {
  id: string
  eventId: string
  organizerId: string
  status: PlanStatus
  revision: number
  invitations: string[]
  participants: {
    userId: string
    response: ResponseKind | null
    /** Personal condition visible only to its author. */
    privateCondition?: string | null
  }[]
}

export const MAX_GROUP_INVITEES = 12
export const MAX_PRIVATE_CONDITION = 280
export const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000

/** PostgreSQL char_length counts Unicode code points, not UTF-16 units. */
export const privateConditionLength = (text: string): number => Array.from(text.trim()).length

const validId = (id: string): boolean => typeof id === 'string' && id.trim().length > 0 && id.length <= 128
const reject = (reason: RuleFailure, message: string): RuleResult => ({ ok: false, reason, message })
const advance = (plan: GroupPlan, participants = plan.participants, status = plan.status,
  invitations = plan.invitations): RuleResult =>
  ({ ok: true, plan: { ...plan, participants, invitations, status, revision: plan.revision + 1 } })
const activeInvitations = (plan: GroupPlan, now: number): PendingInvitation[] =>
  plan.status === 'proposed' ? plan.invitations.filter(invitation => invitation.expiresAt > now) : []

/** A new group proposal has no invitations, responses or implicit attendance. */
export function createGroupPlan(id: string, eventId: string, organizerId: string): RuleResult {
  if (![id, eventId, organizerId].every(validId)) {
    return reject('invalid', 'A plan, real event and authenticated organizer are required.')
  }
  return {
    ok: true,
    plan: { id, eventId, organizerId, status: 'proposed', revision: 0, participants: [], invitations: [] },
  }
}

/**
 * Viewer checks are an extra boundary, not a replacement for database RLS.
 * No client-provided userId may be trusted as the identity of the viewer.
 */
export function readGroupPlan(plan: GroupPlan, actorId: string, now = Date.now()): PlanViewer | null {
  const organizer = plan.organizerId === actorId
  const member = organizer || plan.participants.some(participant => participant.userId === actorId)
  const pending = activeInvitations(plan, now)
  const invited = pending.some(invitation => invitation.userId === actorId)
  if (!member && !invited) return null
  return {
    id: plan.id,
    eventId: plan.eventId,
    organizerId: plan.organizerId,
    status: plan.status,
    revision: plan.revision,
    invitations: pending.filter(invitation => organizer || invitation.userId === actorId).map(x => x.userId),
    participants: (member ? plan.participants : []).map(participant => ({
      userId: participant.userId,
      response: participant.response,
      ...(participant.userId === actorId ? { privateCondition: participant.privateCondition } : {}),
    })),
  }
}

/** Respond always targets the authenticated actor. Command payload cannot impersonate an invitee. */
export function applyGroupCommand(
  plan: GroupPlan,
  actorId: string,
  expectedRevision: number,
  command: PlanCommand,
  now = Date.now(),
): RuleResult {
  if (!validId(actorId) || !readGroupPlan(plan, actorId, now)) {
    return reject('forbidden', 'You do not have access to this plan.')
  }
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
    return reject('invalid', 'A valid plan revision is required.')
  }
  if (expectedRevision !== plan.revision) {
    return reject('stale', 'The plan has changed. Refresh before trying again.')
  }
  const pending = activeInvitations(plan, now)
  const self = plan.participants.some(item => item.userId === actorId)
  const invited = pending.some(item => item.userId === actorId)
  if (command.type === 'leave') {
    if (!self) return reject('forbidden', 'Only a participant may leave.')
    return advance(plan, plan.participants.filter(item => item.userId !== actorId),
      plan.status === 'confirmed' ? 'cancelled' : plan.status)
  }
  if (plan.status !== 'proposed') {
    return reject('conflict', 'This plan is no longer accepting changes.')
  }

  if (command.type === 'accept' || command.type === 'decline') {
    if (!invited || self) return reject('forbidden', 'Invitation unavailable.')
    const remaining = pending.filter(item => item.userId !== actorId)
    const members = command.type === 'accept'
      ? [...plan.participants, { userId: actorId, response: null, privateCondition: null }]
      : plan.participants
    return advance(plan, members, plan.status, remaining)
  }

  if (command.type === 'respond') {
    const participant = plan.participants.find(item => item.userId === actorId)
    if (!participant) return reject('forbidden', 'Only an accepted participant may respond.')
    const response = command.response
    if (response !== 'works' && response !== 'if' && response !== 'cant') {
      return reject('invalid', 'Choose Works, If, or Cannot.')
    }
    const condition = command.privateCondition ?? null
    if (condition !== null && typeof condition !== 'string') {
      return reject('invalid', 'A private condition must be text.')
    }
    if (condition && privateConditionLength(condition) > MAX_PRIVATE_CONDITION) {
      return reject('invalid', 'Private conditions must be 280 characters or fewer.')
    }
    if (response !== 'if' && condition !== null) {
      return reject('invalid', 'Private conditions are only supported for If responses.')
    }
    const updated: Participant[] = plan.participants.map(item => item.userId === actorId
      ? { ...item, response, privateCondition: response === 'if' ? condition?.trim() || null : null }
      : item)
    return advance(plan, updated)
  }

  // Only the organizer can invite, revoke, confirm, or cancel. A link is not identity.
  if (actorId !== plan.organizerId) {
    return reject('forbidden', 'Only the organizer can change the plan or invitations.')
  }
  if (command.type === 'invite') {
    if (!validId(command.userId) || command.userId === plan.organizerId) {
      return reject('invalid', 'Invite a distinct authenticated participant.')
    }
    if (plan.participants.some(item => item.userId === command.userId) || pending.some(item => item.userId === command.userId)) {
      return reject('conflict', 'This participant is already invited.')
    }
    if (plan.participants.length + pending.length >= MAX_GROUP_INVITEES) {
      return reject('conflict', 'The plan has reached its participant limit.')
    }
    return advance(plan, plan.participants, plan.status, [...pending, { userId: command.userId, expiresAt: now + INVITATION_TTL_MS }])
  }
  if (command.type === 'remove') {
    if (!validId(command.userId) || !(plan.participants.some(item => item.userId === command.userId) ||
      pending.some(item => item.userId === command.userId))) {
      return reject('invalid', 'The participant is not invited.')
    }
    return advance(plan, plan.participants.filter(item => item.userId !== command.userId), plan.status,
      pending.filter(item => item.userId !== command.userId))
  }
  if (command.type === 'confirm') {
    if (plan.participants.length === 0) {
      return reject('conflict', 'A shared plan needs at least one invited participant.')
    }
    if (pending.length || !plan.participants.every(item => item.response === 'works')) {
      return reject('conflict', 'Resolve all unknown, conditional or unavailable responses before confirming.')
    }
    return advance(plan, plan.participants, 'confirmed')
  }
  if (command.type === 'cancel') return advance(plan, plan.participants, 'cancelled', [])
  return reject('invalid', 'Unsupported group-plan action.')
}

/** Explicitly preserve unknown responses, rather than counting no reply as Works. */
export function summarizeResponses(plan: GroupPlan): Record<ResponseKind | 'unknown', number> {
  const counts = { works: 0, if: 0, cant: 0, unknown: 0 }
  for (const participant of plan.participants) {
    counts[participant.response ?? 'unknown'] += 1
  }
  return counts
}
