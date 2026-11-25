import { describe, expect, it } from 'vitest'
import {
  GROUP_SIZE_LIMIT, applyGroupCommand, createGroupPlan, readGroupPlan, summarizeResponses,
  type GroupPlan, type PlanCommand,
} from '../src/model/groupPlans'

function newProposal(): GroupPlan {
  const created = createGroupPlan('plan-1', 'event-1', 'organizer')
  if (!created.ok) throw Error(created.message)
  return created.plan
}
function commit(plan: GroupPlan, actor: string, command: PlanCommand): GroupPlan {
  const result = applyGroupCommand(plan, actor, plan.revision, command)
  if (!result.ok) throw Error(result.message)
  return result.plan
}
function invitePair() {
  return commit(commit(newProposal(), 'organizer', { type: 'invite', userId: 'amy' }), 'organizer', { type: 'invite', userId: 'bo' })
}

describe('permissioned group proposal domain', () => {
  it('creates an authentic plan with no implicit attendance', () => {
    const plan = newProposal()
    expect(plan).toEqual({
      id: 'plan-1', eventId: 'event-1', organizerId: 'organizer',
      status: 'proposed', revision: 0, participants: [],
    })
    expect(summarizeResponses(plan)).toEqual({ works: 0, if: 0, cant: 0, unknown: 0 })
    expect(createGroupPlan('', 'event-1', 'organizer')).toMatchObject({ ok: false, reason: 'invalid' })
  })

  it('records independent Works, If and Cannot responses, keeping nonresponse unknown', () => {
    let plan = invitePair()
    expect(summarizeResponses(plan).unknown).toBe(2)
    plan = commit(plan, 'amy', { type: 'respond', response: 'works' })
    plan = commit(plan, 'bo', { type: 'respond', response: 'if', ifCondition: 'Only after 5pm' })
    expect(summarizeResponses(plan)).toEqual({ works: 1, if: 1, cant: 0, unknown: 0 })
    expect(plan.participants[1].ifCondition).toBe('Only after 5pm')
    plan = commit(plan, 'bo', { type: 'respond', response: 'cant' })
    expect(summarizeResponses(plan).cant).toBe(1)
    expect(plan.participants[1].ifCondition).toBeNull()
  })

  it('rejects impersonation and unauthorized edits even with a known plan ID', () => {
    const plan = invitePair()
    const actions: PlanCommand[] = [
      { type: 'invite', userId: 'mallory' },
      { type: 'remove', userId: 'amy' },
      { type: 'confirm' },
      { type: 'cancel' },
    ]
    for (const command of actions) {
      expect(applyGroupCommand(plan, 'amy', plan.revision, command)).toMatchObject({ ok: false, reason: 'forbidden' })
    }
    expect(applyGroupCommand(plan, 'mallory', plan.revision, { type: 'respond', response: 'works' }))
      .toMatchObject({ ok: false, reason: 'forbidden' })
    expect(applyGroupCommand(plan, 'organizer', plan.revision, { type: 'respond', response: 'works' }))
      .toMatchObject({ ok: false, reason: 'forbidden' })

    // Any injected targetId is ignored: the domain writes only the verified actor's response.
    const spoof = { type: 'respond', response: 'works', targetId: 'bo' } as PlanCommand
    const updated = applyGroupCommand(plan, 'amy', plan.revision, spoof)
    if (!updated.ok) throw Error(updated.message)
    expect(updated.plan.participants[0].response).toBe('works')
    expect(updated.plan.participants[1].response).toBeNull()
    expect(plan.participants[0].response).toBeNull() // input remains immutable
  })

  it('shares an If note with the organizer and other members, never with outsiders (owner decision, Nov 24)', () => {
    let plan = invitePair()
    plan = commit(plan, 'bo', { type: 'respond', response: 'if', ifCondition: 'Private family obligation' })
    expect(readGroupPlan(plan, 'mallory')).toBeNull()
    expect(readGroupPlan(plan, 'organizer')?.participants[1]).toEqual({ userId: 'bo', response: 'if', ifCondition: 'Private family obligation' })
    expect(readGroupPlan(plan, 'amy')?.participants[1]).toEqual({ userId: 'bo', response: 'if', ifCondition: 'Private family obligation' })
    // Someone who has not answered If carries no note at all.
    expect(readGroupPlan(plan, 'bo')?.participants[0]).toEqual({ userId: 'amy', response: null })
    expect(readGroupPlan(plan, 'bo')?.participants[1])
      .toEqual({ userId: 'bo', response: 'if', ifCondition: 'Private family obligation' })
  })

  it('rejects stale writes to avoid losing concurrent responses', () => {
    const plan = invitePair()
    const first = applyGroupCommand(plan, 'amy', plan.revision, { type: 'respond', response: 'works' })
    expect(first.ok).toBe(true)
    const second = applyGroupCommand(first.ok ? first.plan : plan, 'bo', plan.revision, { type: 'respond', response: 'works' })
    expect(second).toMatchObject({ ok: false, reason: 'stale' })
    if (first.ok) {
      const retried = applyGroupCommand(first.plan, 'bo', first.plan.revision, { type: 'respond', response: 'works' })
      expect(retried.ok).toBe(true)
    }
  })

  it('requires a genuine resolution of every participant before confirming', () => {
    let plan = invitePair()
    expect(applyGroupCommand(plan, 'organizer', plan.revision, { type: 'confirm' }))
      .toMatchObject({ ok: false, reason: 'conflict' })
    plan = commit(plan, 'amy', { type: 'respond', response: 'works' })
    plan = commit(plan, 'bo', { type: 'respond', response: 'if', ifCondition: 'Need transit' })
    expect(applyGroupCommand(plan, 'organizer', plan.revision, { type: 'confirm' }))
      .toMatchObject({ ok: false, reason: 'conflict' })
    plan = commit(plan, 'bo', { type: 'respond', response: 'works' })
    plan = commit(plan, 'organizer', { type: 'confirm' })
    expect(plan.status).toBe('confirmed')
    expect(applyGroupCommand(plan, 'bo', plan.revision, { type: 'respond', response: 'cant' }))
      .toMatchObject({ ok: false, reason: 'conflict' })
  })

  it('revokes a removed participant immediately in the rule layer', () => {
    let plan = invitePair()
    plan = commit(plan, 'organizer', { type: 'remove', userId: 'amy' })
    expect(readGroupPlan(plan, 'amy')).toBeNull()
    expect(applyGroupCommand(plan, 'amy', plan.revision, { type: 'respond', response: 'works' }))
      .toMatchObject({ ok: false, reason: 'forbidden' })
    expect(summarizeResponses(plan).unknown).toBe(1)
  })

  it('validates private condition text, membership, duplicate invites and limits', () => {
    let plan = invitePair()
    expect(applyGroupCommand(plan, 'bo', plan.revision, { type: 'respond', response: 'if' }))
      .toMatchObject({ ok: false, reason: 'invalid' })
    expect(applyGroupCommand(plan, 'bo', plan.revision, { type: 'respond', response: 'if', ifCondition: 'x'.repeat(281) }))
      .toMatchObject({ ok: false, reason: 'invalid' })
    expect(applyGroupCommand(plan, 'bo', plan.revision, { type: 'respond', response: 'cant', ifCondition: 'hidden' }))
      .toMatchObject({ ok: false, reason: 'invalid' })
    expect(applyGroupCommand(plan, 'organizer', plan.revision, { type: 'invite', userId: 'bo' }))
      .toMatchObject({ ok: false, reason: 'conflict' })
    expect(applyGroupCommand(plan, 'organizer', plan.revision, { type: 'invite', userId: 'organizer' }))
      .toMatchObject({ ok: false, reason: 'invalid' })
    // 12 people at most, the organizer included (review v5.1, page 3): 11 invitees.
    for (let index = 2; index < 11; index++) {
      plan = commit(plan, 'organizer', { type: 'invite', userId: String(index) })
    }
    expect(plan.participants).toHaveLength(11)
    expect(plan.participants.length + 1).toBe(GROUP_SIZE_LIMIT)
    expect(applyGroupCommand(plan, 'organizer', plan.revision, { type: 'invite', userId: 'last' }))
      .toMatchObject({ ok: false, reason: 'conflict' })
  })

  it('keeps cancelling an organizer-only operation and refuses further changes', () => {
    let plan = invitePair()
    expect(applyGroupCommand(plan, 'amy', plan.revision, { type: 'cancel' }))
      .toMatchObject({ ok: false, reason: 'forbidden' })
    plan = commit(plan, 'organizer', { type: 'cancel' })
    expect(plan.status).toBe('cancelled')
    expect(applyGroupCommand(plan, 'organizer', plan.revision, { type: 'invite', userId: 'new' }))
      .toMatchObject({ ok: false, reason: 'conflict' })
  })
})
