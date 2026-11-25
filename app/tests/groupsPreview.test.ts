import { describe, expect, it } from 'vitest'
import {
  GROUPS_KEY, GROUP_SIZE_LIMIT, YOU, acceptInvite, answerOf, answerPlan, canConfirm, createGroupsPreview, declineInvite,
  leaveCancels, leaveGroup, localGroupsPort, newGroup, newId, noteOf, noteOnPlan, proposePlan, toPlanRecord, visibleGroups, waitingOn,
  type GroupsPort, type PreviewGroup,
} from '../src/controller/groupsPreview'
import { sampleGroups, SAMPLE_GOING } from '../src/controller/groupsPreviewSample'
import { GROUP_LIMIT, reachableGroups } from '../src/controller/socialPlans'
import { initialSocial, unreadCount } from '../src/controller/socialStore'
import { friendsGoing } from '../src/controller/friendsGoing'
import { MAX_GROUP_INVITEES } from '../src/model/groupPlans'

// 10:40 on Tuesday 24 November 2026, Santa Clara.
const NOW = new Date('2026-11-24T18:40:00Z')
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

function memoryStorage(seed: Record<string, string> = {}) {
  const data = new Map(Object.entries(seed))
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v) }, data }
}
function memoryPort(groups: PreviewGroup[]): GroupsPort & { sent: unknown[] } {
  const sent: unknown[] = []
  return { sent, load: () => ({ groups }), send: change => { sent.push(change) } }
}
function controller(groups = sampleGroups(), now = () => NOW) {
  const port = memoryPort(groups)
  let going: string[] = []
  const timers: (() => void)[] = []
  const store = createGroupsPreview({ port, now, initialSocial, sampleGoing: SAMPLE_GOING, socialStorage: memoryStorage(),
    going: { read: () => going, write: ids => { going = ids } }, setTimer: f => { timers.push(f) } })
  return { store, port, timers }
}
const group = (id: string) => sampleGroups().find(g => g.id === id)!

describe('one group size', () => {
  it('is 12 people, you and pending invites included, in the model, open invites and the groups preview', () => {
    expect(GROUP_SIZE_LIMIT).toBe(12)
    expect(GROUP_LIMIT).toBe(GROUP_SIZE_LIMIT)
    expect(MAX_GROUP_INVITEES + 1).toBe(GROUP_SIZE_LIMIT)
    const big = newGroup('Big one', Array.from({ length: 20 }, (_, i) => 'P' + i).join(', '))!
    expect(big.members.length + big.invited.length).toBe(GROUP_SIZE_LIMIT)
  })
})

describe('seeding the sample groups', () => {
  it('seeds only when nothing was ever kept, and an emptied list stays empty after reload', () => {
    const fresh = memoryStorage()
    expect(localGroupsPort(sampleGroups, fresh).load()!.groups).toHaveLength(5)
    expect(fresh.data.has(GROUPS_KEY)).toBe(true)
    const emptied = memoryStorage({ [GROUPS_KEY]: '[]' })
    expect(localGroupsPort(sampleGroups, emptied).load()!.groups).toEqual([])
  })

  it('carries over groups kept by the earlier version, notes included', () => {
    const old = [{ id: 'g9', name: 'Old', members: ['Ana', YOU], invited: [], plans: [
      { id: 'p9', eventId: 'e1', by: 'Ana', status: 'proposed', answers: { Ana: 'if', [YOU]: 'if' }, myNote: 'after lab', notes: { Ana: 'if it is dry' } }] }]
    const g = localGroupsPort(sampleGroups, memoryStorage({ 'sidequest.demo-friend-groups.v2': JSON.stringify(old) })).load()!.groups[0]
    expect(noteOf(g.plans[0], YOU)).toBe('after lab')
    expect(noteOf(g.plans[0], 'Ana')).toBe('if it is dry')
    expect(g.plans[0].organizerId).toBe('Ana')
  })
})

describe('answers and If notes (shared with the group)', () => {
  it('a new proposal starts with your own Works and nobody else answered', () => {
    const plan = proposePlan(group('g1'), 'e1')
    expect(answerOf(plan, YOU)).toBe('works')
    for (const m of ['Maya', 'Jun', 'Theo']) expect(answerOf(plan, m)).toBeNull()
    expect(plan.id).toMatch(UUID)
  })

  it('a note belongs to If only: it stays while If, and Works clears it', () => {
    let plan = proposePlan(group('g1'), 'e1', 'Maya')
    expect(noteOf(noteOnPlan(plan, YOU, 'after lab'), YOU)).toBeNull()
    plan = noteOnPlan(answerPlan(plan, YOU, 'if'), YOU, 'after lab')
    expect(noteOf(plan, YOU)).toBe('after lab')
    plan = answerPlan(plan, YOU, 'works')
    expect(noteOf(plan, YOU)).toBeNull()
    expect(noteOf(answerPlan(plan, YOU, 'if'), YOU)).toBeNull()
  })

  it('Confirm stays off while an invitee has not joined, even when every member said Works', () => {
    const g = group('g2')
    const plan = { ...proposePlan(g, 'e1'), participants: g.members.map(m => ({ userId: m, response: 'works' as const, ifCondition: null })) }
    expect(g.invited).toEqual(['Diego'])
    expect(waitingOn(g, plan)).toBe(1)
    expect(canConfirm(g, plan)).toBe(false)
    expect(canConfirm({ ...g, invited: [] }, plan)).toBe(true)
    // Only the proposer confirms.
    expect(canConfirm({ ...g, invited: [] }, { ...plan, organizerId: 'Priya' })).toBe(false)
  })

  it('in #89 shape the organizer sits outside the participants and pending invites are listed', () => {
    const g = group('g2'), rec = toPlanRecord(g, proposePlan(g, 'e1'))
    expect(rec.participants.map(p => p.userId)).toEqual(['Priya', 'Sam'])
    expect(rec.invitations).toEqual(['Diego'])
  })
})

describe('leave is not decline', () => {
  it('decline drops your invitation and changes no plan; leave drops your membership and cancels the confirmed plan', () => {
    const film = group('g5'), declined = declineInvite(film)
    expect(declined.invited).not.toContain(YOU)
    expect(declined.plans).toEqual(film.plans)
    const choir = group('g3')
    expect(leaveCancels(choir)).toBe(true)
    const left = leaveGroup(choir)
    expect(left.members).not.toContain(YOU)
    expect(left.plans[0].status).toBe('cancelled')
    expect(left.plans[0].participants.map(p => p.userId)).not.toContain(YOU)
    expect(visibleGroups([left, declined])).toEqual([])
    expect(acceptInvite(film).members).toContain(YOU)
  })
})

describe('one controller for Groups, open invites and friends going', () => {
  it('leaving a group removes its friends from "going" at once', () => {
    const { store } = controller()
    const events = Array.from({ length: 12 }, (_, i) => ({ id: 'e' + i }))
    const going = () => { const d = store.goingData(events); return friendsGoing({ eventId: 'e3', you: YOU, groups: d.groups, shares: d.shares, total: 0 })?.friends ?? [] }
    expect(going()).toEqual(expect.arrayContaining(['Jun', 'Theo', 'Priya']))
    store.leave('g1')
    expect(going()).not.toContain('Jun')
    expect(going()).toContain('Priya')
  })

  it('a new group is in "Send to" right away', () => {
    const { store } = controller()
    const id = store.makeGroup('Study buddies', 'Lee')!
    expect(id).toMatch(UUID)
    expect(reachableGroups(store.socialGroups(), YOU).map(g => g.id)).toContain(id)
  })

  it('every change goes through the port, in #89 action words', () => {
    const { store, port } = controller()
    store.answer('g1', 'p1', 'if')
    store.setNote('g1', 'p1', 'after lab')
    expect(port.sent).toEqual([
      { kind: 'plan', groupId: 'g1', planId: 'p1', expectedRevision: 0, action: { action: 'respond', expectedRevision: 0, response: 'if' } },
      { kind: 'plan', groupId: 'g1', planId: 'p1', expectedRevision: 1, action: { action: 'respond', expectedRevision: 1, response: 'if', condition: 'after lab' } },
    ])
  })

  it('confirm refuses while someone is waiting', () => {
    const { store } = controller()
    store.propose('g2', 'e1')
    const plan = store.getState().groups.find(g => g.id === 'g2')!.plans[0]
    store.confirm('g2', plan.id)
    expect(store.getState().groups.find(g => g.id === 'g2')!.plans[0].status).toBe('proposed')
  })

  it('reading the inbox clears it even when the demo clock is ahead of the real one, and settles', () => {
    const ahead = () => new Date(Date.now() + 3_600_000)
    const { store } = controller(sampleGroups(), ahead)
    expect(store.unread()).toBe(1)
    let changes = 0
    store.subscribe(() => { changes++ })
    store.markRead(); store.markRead(); store.markRead()
    expect(store.unread()).toBe(0)
    expect(changes).toBe(1)
    const s = store.getState().social
    expect(s.readAt).toBeGreaterThanOrEqual(Math.max(...s.notices.map(n => n.at)))
    expect(unreadCount(s)).toBe(0)
  })

  it('a sent invite gets a random ID and sample friends join through the same state', () => {
    const { store, timers } = controller()
    const id = store.send({ title: 'Study break', date: '2026-11-24', start: '12:00', end: '13:00', groupIds: ['g1'] })
    expect(id).toMatch(UUID)
    timers.forEach(f => f())
    expect(store.getState().social.invites.find(i => i.id === id)!.joins.length).toBeGreaterThan(0)
    expect(store.getState().social.notices.every(n => UUID.test(n.id) || n.id.startsWith('n-'))).toBe(true)
  })

  it('an answering port (the server, next step) replaces the optimistic plan with its record', async () => {
    const g = group('g1')
    let resolve: (v: unknown) => void = () => {}
    const port: GroupsPort = { load: async () => ({ groups: [g] }), send: () => new Promise(r => { resolve = r as never }) }
    const store = createGroupsPreview({ port, now: () => NOW, initialSocial, socialStorage: memoryStorage(), going: { read: () => [], write: () => {} } })
    await Promise.resolve(); await Promise.resolve()
    expect(store.visibleGroups().map(x => x.id)).toEqual(['g1'])
    store.answer('g1', 'p1', 'if')
    resolve(toPlanRecord(g, { ...g.plans[0], revision: 7, participants: g.plans[0].participants.map(p => p.userId === YOU ? { ...p, response: 'if', ifCondition: 'from server' } : p) }))
    await new Promise(r => setTimeout(r, 0))
    const plan = store.getState().groups[0].plans[0]
    expect(plan.revision).toBe(7)
    expect(noteOf(plan, YOU)).toBe('from server')
    expect(plan.organizerId).toBe('Maya')
  })

  it('newId works without randomUUID (plain http)', () => {
    const real = globalThis.crypto.randomUUID
    try {
      Object.defineProperty(globalThis.crypto, 'randomUUID', { value: undefined, configurable: true })
      expect(newId()).toMatch(UUID)
    } finally { Object.defineProperty(globalThis.crypto, 'randomUUID', { value: real, configurable: true }) }
  })
})
