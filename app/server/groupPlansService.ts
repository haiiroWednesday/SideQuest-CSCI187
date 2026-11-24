// SERVER APPLICATION SERVICE: orchestrates group-plan rules, storage and event IDs.
// There is deliberately no HTTP route until authentication and live RLS are agreed.
// An actor MUST come from verified server-side authentication, never a request body.
import type { EventCatalogPort } from '../src/model/eventCatalog'
import {
  applyGroupCommand, createGroupPlan, readGroupPlan,
  type GroupPlan, type PlanCommand, type PlanViewer, type RuleFailure,
} from '../src/model/groupPlans'

export interface GroupPlanRepository {
  /** No raw plan should ever be sent to an untrusted browser. */
  get(id: string): Promise<GroupPlan | null>
  create(plan: GroupPlan): Promise<boolean>
  /** Atomic revision check, not read-then-unconditional-update. */
  compareAndSwap(id: string, expectedRevision: number, plan: GroupPlan): Promise<boolean>
}

export type VerifiedServerActor = {
  /** Derived from a verified, non-revoked session, never from client JSON. */
  readonly userId: string
}

type ServiceFailure = {
  ok: false
  reason: RuleFailure | 'not_found' | 'unavailable'
  message: string
}
export type ServiceResult<T> = { ok: true; value: T } | ServiceFailure

const denied = (): ServiceFailure =>
  ({ ok: false, reason: 'not_found', message: 'Plan unavailable.' })
const failed = (): ServiceFailure =>
  ({ ok: false, reason: 'unavailable', message: 'The group plan could not be saved or loaded.' })

export function createGroupPlanService(
  repository: GroupPlanRepository,
  catalog: Pick<EventCatalogPort, 'getById'>,
) {
  return {
    async create(planId: string, eventId: string, actor: VerifiedServerActor): Promise<ServiceResult<PlanViewer>> {
      const draft = createGroupPlan(planId, eventId, actor.userId)
      if (!draft.ok) return draft
      try {
        if (!await catalog.getById(eventId)) return denied()
        if (!await repository.create(draft.plan)) {
          return { ok: false, reason: 'conflict', message: 'Plan ID already exists.' }
        }
        return { ok: true, value: readGroupPlan(draft.plan, actor.userId)! }
      } catch { return failed() }
    },
    async get(planId: string, actor: VerifiedServerActor): Promise<ServiceResult<PlanViewer>> {
      try {
        const plan = await repository.get(planId)
        const view = plan && readGroupPlan(plan, actor.userId)
        return view ? { ok: true, value: view } : denied()
      } catch { return failed() }
    },
    async act(
      planId: string, actor: VerifiedServerActor, expectedRevision: number, command: PlanCommand,
    ): Promise<ServiceResult<PlanViewer | null>> {
      try {
        const plan = await repository.get(planId)
        // Authorization happens BEFORE revision/command validation to avoid probing
        // whether an inaccessible plan exists or was recently modified.
        if (!plan || !readGroupPlan(plan, actor.userId)) return denied()
        const updated = applyGroupCommand(plan, actor.userId, expectedRevision, command)
        if (!updated.ok) return updated
        const saved = await repository.compareAndSwap(planId, plan.revision, updated.plan)
        if (!saved) return { ok: false, reason: 'stale', message: 'The plan changed during your update. Refresh and retry.' }
        if (command.type === 'decline' || command.type === 'leave') return { ok: true, value: null }
        const view = readGroupPlan(updated.plan, actor.userId)
        return view ? { ok: true, value: view } : denied()
      } catch { return failed() }
    },
  }
}
