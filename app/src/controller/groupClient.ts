// CONTROLLER: a typed, same-origin group transport bound to a REAL authenticated
// session provider. No token input, browser storage or guessed account IDs here.
// The app's eventual sign-in module must supply the provider and verified actor.
import { MAX_GROUP_INVITEES, type ResponseKind, type PlanStatus } from '../model/groupPlans'

import { isScuCalendarId } from '../model/scuCalendarId'
import type { CampusEvent } from '../model/eventCatalog'

export { GROUP_SIZE_LIMIT, MAX_GROUP_INVITEES, MAX_IF_CONDITION, ifConditionLength } from '../model/groupPlans'
export type GroupResponse = ResponseKind
export type GroupStatus = PlanStatus
export type GroupAction =
  | { action: 'respond'; expectedRevision: number; response: GroupResponse; condition?: string }
  | { action: 'invite' | 'remove'; expectedRevision: number; inviteeId: string }
  | { action: 'confirm' | 'cancel' | 'accept' | 'decline' | 'leave'; expectedRevision: number }

export type GroupMemberView = {
  userId: string
  response: GroupResponse | null
  ifCondition?: string | null
}
export type GroupSummary = {
  id: string
  eventId: string
  organizerId: string
  status: GroupStatus
  revision: number
}
export type GroupDetail = GroupSummary & { participants: GroupMemberView[]; invitations: string[] }

export interface GroupClientPort {
  list(): Promise<GroupSummary[]>
  create(eventId: string): Promise<GroupDetail>
  get(id: string): Promise<GroupDetail>
  act(id: string, command: GroupAction): Promise<GroupDetail | null>
}
export type GroupAccessTokenProvider = () => Promise<string | null>

// Only posted events have a persistent event foreign key for group plans.
export function groupPlanEventOptions(events: readonly CampusEvent[]): CampusEvent[] {
  return events.filter(event => !isScuCalendarId(event.id))
}

export class GroupClientError extends Error {
  constructor(readonly status: number, message: string) { super(message) }
}

function record(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null
}
function isStatus(v: unknown): v is GroupStatus {
  return v === 'proposed' || v === 'confirmed' || v === 'cancelled'
}
function isResponse(v: unknown): v is GroupResponse | null {
  return v === null || v === 'works' || v === 'if' || v === 'cant'
}
function summary(v: unknown): GroupSummary {
  const x = record(v)
  if (!x || typeof x.id !== 'string' || typeof x.eventId !== 'string' ||
      typeof x.organizerId !== 'string' || !isStatus(x.status) ||
      !Number.isSafeInteger(x.revision) || Number(x.revision) < 0) {
    throw new GroupClientError(503, 'The group service returned invalid data.')
  }
  return { id: x.id, eventId: x.eventId, organizerId: x.organizerId,
    status: x.status, revision: x.revision as number }
}
function detail(v: unknown): GroupDetail {
  const value = record(v), base = summary(v)
  if (!value || !Array.isArray(value.participants) || !Array.isArray(value.invitations) ||
      value.invitations.some(id => typeof id !== 'string') ||
      value.participants.length + value.invitations.length > MAX_GROUP_INVITEES) {
    throw new GroupClientError(503, 'The group service returned invalid data.')
  }
  return {
    ...base,
    invitations: value.invitations as string[],
    participants: value.participants.map((item: unknown) => {
      const row = record(item)
      if (!row || typeof row.userId !== 'string' || !isResponse(row.response) ||
        (row.ifCondition !== undefined && row.ifCondition !== null &&
          typeof row.ifCondition !== 'string')) {
        throw new GroupClientError(503, 'The group service returned invalid participant data.')
      }
      return {
        userId: row.userId,
        response: row.response,
        ...(row.ifCondition === undefined ? {} : { ifCondition: row.ifCondition }),
      }
    }),
  }
}

export function createAuthenticatedGroupClient(
  tokenProvider: GroupAccessTokenProvider,
  fetcher: typeof fetch = fetch,
): GroupClientPort {
  const request = async (path: string, payload?: unknown): Promise<unknown> => {
    const token = await tokenProvider()
    if (!token) throw new GroupClientError(401, 'Sign in to access group plans.')
    let res: Response
    try {
      res = await fetcher(path, {
        method: payload === undefined ? 'GET' : 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          ...(payload === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
        credentials: 'omit',
        cache: 'no-store',
      })
    } catch {
      throw new GroupClientError(503, 'The group service could not be reached.')
    }
    if (!res.ok) {
      if (res.status === 401) throw new GroupClientError(401, 'Your session expired. Sign in again.')
      if (res.status === 404) throw new GroupClientError(404, 'Plan unavailable.')
      if (res.status === 409) throw new GroupClientError(409, 'The plan changed. Refresh to see the latest responses.')
      throw new GroupClientError(res.status, 'The group request could not be completed.')
    }
    try { return await res.json() as unknown }
    catch { throw new GroupClientError(503, 'The group response could not be read.') }
  }
  return {
    async list() {
      const data = await request('/api/groups')
      if (!Array.isArray(data)) throw new GroupClientError(503, 'The group list is invalid.')
      return data.map(summary)
    },
    async create(eventId) { return detail(await request('/api/groups', { eventId })) },
    async get(id) { return detail(await request('/api/groups/' + encodeURIComponent(id))) },
    async act(id, command) {
      const result = await request('/api/groups/' + encodeURIComponent(id) + '/actions', command)
      if (command.action === 'leave' || command.action === 'decline') {
        if (result !== null) throw new GroupClientError(503, 'The group service returned invalid data.')
        return null
      }
      return detail(result)
    },
  }
}
