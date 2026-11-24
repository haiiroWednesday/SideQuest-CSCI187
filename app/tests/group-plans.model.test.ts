import { describe, expect, it } from 'vitest'
import {
  applyGroupCommand, createGroupPlan, readGroupPlan, summarizeResponses,
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
  let plan = commit(commit(newProposal(), 'organizer', { type: 'invite', userId: 'amy' }), 'organizer', { type: 'invite', userId: 'bo' })
  plan = commit(plan, 'amy', { type: 'accept' })
  return commit(plan, 'bo', { type: 'accept' })
}

describe('permissioned group proposal domain', () => {
  it('creates an authentic plan with no implicit attendance', () => {
    const plan = newProposal()
    expect(plan).toEqual({
      id: 'plan-1', eventId: 'event-1', organizerId: 'organizer',
      status: 'proposed', revision: 0, participants: [], invitations: [],
    })
    expect(summarizeResponses(plan)).toEqual({ works: 0, if: 0, cant: 0, unknown: 0 })
    expect(createGroupPlan('', 'event-1', 'organizer')).toMatchObject({ ok: false, reason: 'invalid' })
  })

  it('keeps invitation acceptance separate from attendance and hides members until consent', () => {
    let plan = commit(newProposal(), 'organizer', { type: 'invite', userId: 'amy' })
    plan = commit(plan, 'organizer', { type: 'invite', userId: 'bo' })
    plan = commit(plan, 'bo', { type: 'accept' })
    expect(readGroupPlan(plan, 'amy')).toMatchObject({ invitations: ['amy'], participants: [] })
    expect(applyGroupCommand(plan, 'amy', plan.revision, { type: 'respond', response: 'works' })).toMatchObject({ ok: false, reason: 'forbidden' })
    const expired = Date.now() + 8 * 24 * 60 * 60 * 1000
    expect(readGroupPlan(plan, 'amy', expired)).toBeNull()
    expect(applyGroupCommand(plan, 'amy', plan.revision, { type: 'accept' }, expired)).toMatchObject({ ok: false })
    plan = commit(plan, 'amy', { type: 'decline' })
    expect(readGroupPlan(plan, 'amy')).toBeNull()
    plan = commit(plan, 'bo', { type: 'respond', response: 'works' })
    plan = commit(plan, 'organizer', { type: 'confirm' })
    plan = commit(plan, 'bo', { type: 'leave' })
    expect(plan.status).toBe('cancelled')
    expect(readGroupPlan(plan, 'bo')).toBeNull()
  })

  it('records independent Works, If and Cannot responses, keeping nonresponse unknown', () => {
    let plan = invitePair()
    expect(summarizeResponses(plan).unknown).toBe(2)
    plan = commit(plan, 'amy', { type: 'respond', response: 'works' })
    plan = commit(plan, 'bo', { type: 'respond', response: 'if', privateCondition: 'Only after 5pm' })
    expect(summarizeResponses(plan)).toEqual({ works: 1, if: 1, cant: 0, unknown: 0 })
    expect(plan.participants[1].privateCondition).toBe('Only after 5pm')
    plan = commit(plan, 'bo', { type: 'respond', response: 'cant' })
    expect(summarizeResponses(plan).cant).toBe(1)
    expect(plan.participants[1].privateCondition).toBeNull()
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

  it('redacts private conditions from organizer and other participants', () => {
    let plan = invitePair()
    plan = commit(plan, 'bo', { type: 'respond', response: 'if', privateCondition: 'Private family obligation' })
    expect(readGroupPlan(plan, 'mallory')).toBeNull()
    expect(readGroupPlan(plan, 'organizer')?.participants[1]).toEqual({ userId: 'bo', response: 'if' })
    expect(readGroupPlan(plan, 'amy')?.participants[1]).toEqual({ userId: 'bo', response: 'if' })
    expect(readGroupPlan(plan, 'bo')?.participants[1])
      .toEqual({ userId: 'bo', response: 'if', privateCondition: 'Private family obligation' })
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
    plan = commit(plan, 'bo', { type: 'respond', response: 'if', privateCondition: 'Need transit' })
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
    for (const privateCondition of [undefined, null, '', '  ']) {
      const conditional = commit(plan, 'bo', { type: 'respond', response: 'if', privateCondition })
      expect(conditional.participants.find(item => item.userId === 'bo'))
        .toMatchObject({ response: 'if', privateCondition: null })
      expect(applyGroupCommand(conditional, 'organizer', conditional.revision, { type: 'confirm' }))
        .toMatchObject({ ok: false, reason: 'conflict' })
    }
    expect(applyGroupCommand(plan, 'bo', plan.revision, { type: 'respond', response: 'if', privateCondition: 'x'.repeat(281) }))
      .toMatchObject({ ok: false, reason: 'invalid' })
    expect(applyGroupCommand(plan, 'bo', plan.revision, { type: 'respond', response: 'cant', privateCondition: 'hidden' }))
      .toMatchObject({ ok: false, reason: 'invalid' })
    expect(applyGroupCommand(plan, 'organizer', plan.revision, { type: 'invite', userId: 'bo' }))
      .toMatchObject({ ok: false, reason: 'conflict' })
    expect(applyGroupCommand(plan, 'organizer', plan.revision, { type: 'invite', userId: 'organizer' }))
      .toMatchObject({ ok: false, reason: 'invalid' })
    for (let index = 2; index < 12; index++) {
      plan = commit(plan, 'organizer', { type: 'invite', userId: String(index) })
    }
    expect(plan.participants.length + plan.invitations.length).toBe(12)
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
