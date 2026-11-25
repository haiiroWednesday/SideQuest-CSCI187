// MODEL: deterministic collaboration rules. This module cannot authenticate anyone.
// A trusted server must derive actorId from a verified session, persist revisions
// atomically, and enforce read permissions before exposing plans or If notes.
// If notes are SHARED with the plan's members (owner decision, Nov 24; PR #89 names them ifCondition).

export type ResponseKind = 'works' | 'if' | 'cant'
export type PlanStatus = 'proposed' | 'confirmed' | 'cancelled'

export type Participant = {
  userId: string
  response: ResponseKind | null
  ifCondition: string | null
}

export type GroupPlan = {
  id: string
  eventId: string
  organizerId: string
  status: PlanStatus
  revision: number
  participants: Participant[]
}

export type PlanCommand =
  | { type: 'invite'; userId: string }
  | { type: 'remove'; userId: string }
  | { type: 'respond'; response: ResponseKind; ifCondition?: string | null }
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
  participants: {
    userId: string
    response: ResponseKind | null
    /** The If note. Every member sees it; only an If answer carries one. */
    ifCondition?: string | null
  }[]
}

/** People in a group or plan, you and pending invites included (review v5.1, page 3). The one limit. */
export const GROUP_SIZE_LIMIT = 12
/** Everyone beside the organizer. */
export const MAX_GROUP_INVITEES = GROUP_SIZE_LIMIT - 1
export const MAX_IF_CONDITION = 280

const validId = (id: string): boolean => typeof id === 'string' && id.trim().length > 0 && id.length <= 128
const reject = (reason: RuleFailure, message: string): RuleResult => ({ ok: false, reason, message })
const advance = (plan: GroupPlan, participants = plan.participants, status = plan.status): RuleResult =>
  ({ ok: true, plan: { ...plan, participants, status, revision: plan.revision + 1 } })

/** A new group proposal has no invitations, responses or implicit attendance. */
export function createGroupPlan(id: string, eventId: string, organizerId: string): RuleResult {
  if (![id, eventId, organizerId].every(validId)) {
    return reject('invalid', 'A plan, real event and authenticated organizer are required.')
  }
  return {
    ok: true,
    plan: { id, eventId, organizerId, status: 'proposed', revision: 0, participants: [] },
  }
}

/**
 * Viewer checks are an extra boundary, not a replacement for database RLS.
 * No client-provided userId may be trusted as the identity of the viewer.
 */
export function readGroupPlan(plan: GroupPlan, actorId: string): PlanViewer | null {
  const member = plan.organizerId === actorId ||
    plan.participants.some(participant => participant.userId === actorId)
  if (!member) return null
  return {
    id: plan.id,
    eventId: plan.eventId,
    organizerId: plan.organizerId,
    status: plan.status,
    revision: plan.revision,
    participants: plan.participants.map(participant => ({
      userId: participant.userId,
      response: participant.response,
      // Shared with members: your own entry always, anyone else's when they answered If.
      ...(participant.userId === actorId || participant.response === 'if'
        ? { ifCondition: participant.response === 'if' ? participant.ifCondition : null } : {}),
    })),
  }
}

/** Respond always targets the authenticated actor. Command payload cannot impersonate an invitee. */
export function applyGroupCommand(
  plan: GroupPlan,
  actorId: string,
  expectedRevision: number,
  command: PlanCommand,
): RuleResult {
  if (!validId(actorId) ||
    (actorId !== plan.organizerId && !plan.participants.some(item => item.userId === actorId))) {
    return reject('forbidden', 'You do not have access to this plan.')
  }
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
    return reject('invalid', 'A valid plan revision is required.')
  }
  if (expectedRevision !== plan.revision) {
    return reject('stale', 'The plan has changed. Refresh before trying again.')
  }
  if (plan.status !== 'proposed') {
    return reject('conflict', 'This plan is no longer accepting changes.')
  }

  if (command.type === 'respond') {
    const participant = plan.participants.find(item => item.userId === actorId)
    if (!participant) return reject('forbidden', 'Only an invited participant may respond.')
    const response = command.response
    if (response !== 'works' && response !== 'if' && response !== 'cant') {
      return reject('invalid', "Choose Works, If… or Can't.")
    }
    const condition = command.ifCondition ?? null
    if (condition !== null && typeof condition !== 'string') {
      return reject('invalid', 'An If note must be text.')
    }
    if (response === 'if' && (!condition || !condition.trim())) {
      return reject('invalid', 'An If answer needs a note.')
    }
    if (condition && condition.length > MAX_IF_CONDITION) {
      return reject('invalid', 'If notes must be 280 characters or fewer.')
    }
    if (response !== 'if' && condition) {
      return reject('invalid', 'Only an If answer carries a note.')
    }
    const updated: Participant[] = plan.participants.map(item => item.userId === actorId
      ? { ...item, response, ifCondition: response === 'if' ? condition!.trim() : null }
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
    if (plan.participants.some(item => item.userId === command.userId)) {
      return reject('conflict', 'This participant is already invited.')
    }
    if (plan.participants.length >= MAX_GROUP_INVITEES) {
      return reject('conflict', 'The plan has reached its participant limit.')
    }
    return advance(plan, [...plan.participants, { userId: command.userId, response: null, ifCondition: null }])
  }
  if (command.type === 'remove') {
    if (!validId(command.userId) || !plan.participants.some(item => item.userId === command.userId)) {
      return reject('invalid', 'The participant is not invited.')
    }
    return advance(plan, plan.participants.filter(item => item.userId !== command.userId))
  }
  if (command.type === 'confirm') {
    if (plan.participants.length === 0) {
      return reject('conflict', 'A shared plan needs at least one invited participant.')
    }
    if (!plan.participants.every(item => item.response === 'works')) {
      return reject('conflict', 'Resolve all unknown, conditional or unavailable responses before confirming.')
    }
    return advance(plan, plan.participants, 'confirmed')
  }
  if (command.type === 'cancel') return advance(plan, plan.participants, 'cancelled')
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
