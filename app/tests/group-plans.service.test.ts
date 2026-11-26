import { describe, expect, it, vi } from 'vitest'
import {
  createGroupPlanService, type GroupPlanRepository, type VerifiedServerActor,
} from '../server/groupPlansService'
import type { GroupPlan } from '../src/model/groupPlans'

function fixture() {
  const records = new Map<string, GroupPlan>()
  const repo: GroupPlanRepository = {
    async get(id) { return records.get(id) ?? null },
    async create(plan) {
      if (records.has(plan.id)) return false
      records.set(plan.id, plan)
      return true
    },
    async compareAndSwap(id, revision, plan) {
      if (records.get(id)?.revision !== revision) return false
      records.set(id, plan)
      return true
    },
  }
  const catalog = { getById: vi.fn(async (id: string) => id === 'event-1'
    ? { id: 'event-1', title: 'Campus concert', hostName: 'SCU', description: 'Concert', location: 'Music Hall', date: '2030-11-07', start: '14:00', end: '15:00' }
    : null) }
  const service = createGroupPlanService(repo, catalog)
  const organizer: VerifiedServerActor = { userId: 'organizer' }
  const amy: VerifiedServerActor = { userId: 'amy' }
  const bo: VerifiedServerActor = { userId: 'bo' }
  const outsider: VerifiedServerActor = { userId: 'outsider' }
  return { repo, records, catalog, service, organizer, amy, bo, outsider }
}

describe('server group-plan orchestration and permission boundary', () => {
  it('only creates a plan connected to a catalog event and cannot overwrite IDs', async () => {
    const f = fixture()
    expect(await f.service.create('plan-1', 'missing-event', f.organizer))
      .toMatchObject({ ok: false, reason: 'not_found' })
    expect(f.records.size).toBe(0)
    const created = await f.service.create('plan-1', 'event-1', f.organizer)
    expect(created).toMatchObject({ ok: true, value: { eventId: 'event-1', revision: 0 } })
    expect(f.records.size).toBe(1)
    expect(await f.service.create('plan-1', 'event-1', f.organizer))
      .toMatchObject({ ok: false, reason: 'conflict' })
  })

  it('applies participant changes, shares If notes with members, and denies unauthorized reads', async () => {
    const f = fixture()
    await f.service.create('plan-1', 'event-1', f.organizer)
    expect(await f.service.get('plan-1', f.outsider)).toMatchObject({ ok: false, reason: 'not_found' })
    let added = await f.service.act('plan-1', f.organizer, 0, { type: 'invite', userId: 'amy' })
    expect(added).toMatchObject({ ok: true, value: { revision: 1 } })
    expect(await f.service.get('plan-1', f.amy)).toMatchObject({ ok: true })
    expect(await f.service.act('plan-1', f.amy, 1, { type: 'accept' })).toMatchObject({ ok: true })
    const answered = await f.service.act('plan-1', f.amy, 2, {
      type: 'respond', response: 'if', ifCondition: 'Can only attend after 4',
    })
    expect(answered).toMatchObject({ ok: true, value: { revision: 3 } })
    if (!answered.ok || !answered.value) throw Error('Response was not saved')
    expect(answered.value.participants[0].ifCondition).toBe('Can only attend after 4')
    const organizerView = await f.service.get('plan-1', f.organizer)
    if (!organizerView.ok) throw Error(organizerView.message)
    // If notes are shared with accepted members and the organizer (team decision, Nov 24).
    expect(organizerView.value.participants[0]).toEqual({ userId: 'amy', response: 'if', ifCondition: 'Can only attend after 4' })
    expect(await f.service.act('plan-1', f.outsider, 0, { type: 'confirm' }))
      .toMatchObject({ ok: false, reason: 'not_found' })
  })

  it('keeps stale updates from clobbering a newer response', async () => {
    const f = fixture()
    await f.service.create('plan-1', 'event-1', f.organizer)
    await f.service.act('plan-1', f.organizer, 0, { type: 'invite', userId: 'amy' })
    await f.service.act('plan-1', f.organizer, 1, { type: 'invite', userId: 'bo' })
    await f.service.act('plan-1', f.amy, 2, { type: 'accept' })
    await f.service.act('plan-1', f.bo, 3, { type: 'accept' })
    expect(await f.service.act('plan-1', f.amy, 4, { type: 'respond', response: 'works' }))
      .toMatchObject({ ok: true })
    expect(await f.service.act('plan-1', f.bo, 4, { type: 'respond', response: 'cant' }))
      .toMatchObject({ ok: false, reason: 'stale' })
    expect(await f.service.act('plan-1', f.bo, 5, { type: 'respond', response: 'cant' }))
      .toMatchObject({ ok: true })
    expect(f.records.get('plan-1')?.participants.map(x => x.response)).toEqual(['works', 'cant'])
  })

  it('returns stale if the repository rejects an atomic compare-and-swap', async () => {
    const f = fixture()
    await f.service.create('plan-1', 'event-1', f.organizer)
    const unstableRepo: GroupPlanRepository = {
      ...f.repo,
      compareAndSwap: vi.fn(async () => false),
    }
    const service = createGroupPlanService(unstableRepo, f.catalog)
    expect(await service.act('plan-1', f.organizer, 0, { type: 'invite', userId: 'amy' }))
      .toMatchObject({ ok: false, reason: 'stale' })
    expect(f.records.get('plan-1')?.participants).toEqual([])
  })

  it('revokes a participant from reading or responding after removal', async () => {
    const f = fixture()
    await f.service.create('plan-1', 'event-1', f.organizer)
    await f.service.act('plan-1', f.organizer, 0, { type: 'invite', userId: 'amy' })
    await f.service.act('plan-1', f.organizer, 1, { type: 'remove', userId: 'amy' })
    expect(await f.service.get('plan-1', f.amy)).toMatchObject({ ok: false, reason: 'not_found' })
    expect(await f.service.act('plan-1', f.amy, 2, { type: 'respond', response: 'works' }))
      .toMatchObject({ ok: false, reason: 'not_found' })
  })

  it('does not turn database or catalog exceptions into success responses', async () => {
    const f = fixture()
    const unavailable = createGroupPlanService({
      ...f.repo,
      create: vi.fn(async () => { throw Error('database down') }),
    }, f.catalog)
    expect(await unavailable.create('plan-1', 'event-1', f.organizer))
      .toMatchObject({ ok: false, reason: 'unavailable' })
    const throwOnRead = createGroupPlanService({
      ...f.repo,
      get: vi.fn(async () => { throw Error('storage down') }),
    }, f.catalog)
    expect(await throwOnRead.get('plan-1', f.organizer))
      .toMatchObject({ ok: false, reason: 'unavailable' })
  })
})
