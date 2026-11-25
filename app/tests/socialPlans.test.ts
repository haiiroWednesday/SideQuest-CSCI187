import { describe, expect, it } from 'vitest'
import {
  GROUP_LIMIT, audienceOf, bestPlanGroup, callOff, canMakePlan, cleanSlots, commonDays, commonTime, inviteErrors, isExpired,
  join, joinBlock, leaveInvite, makeInvite, markPlanned, reachableGroups, visibleInvites, type FreeShare, type SocialGroup,
} from '../src/controller/socialPlans'
import { demoShares, initialSocial, readSocial, sampleFreeFor, sampleJoiners, unreadCount, writeSocial, SAMPLE_NOT_SHARING } from '../src/controller/socialStore'

// 10:40 on Tuesday 24 November 2026, Santa Clara.
const NOW = new Date('2026-11-24T18:40:00Z')
const groups: SocialGroup[] = [
  { id: 'g1', name: 'Swig', members: ['Maya', 'Jun', 'Theo', 'You'] },
  { id: 'g2', name: 'ACM', members: ['Priya', 'Sam', 'You'] },
  { id: 'g5', name: 'Film', members: ['Ana', 'Ben'], inviteFrom: 'Ana' },
]
const draft = { title: 'Boba run', place: 'Benson', date: '2026-11-24', start: '13:00', end: '14:00', groupIds: ['g1'] }

describe('open invites', () => {
  it('reach only full members of the chosen groups, never a group you are only invited to', () => {
    expect(reachableGroups(groups, 'You').map(g => g.id)).toEqual(['g1', 'g2'])
    expect(audienceOf({ by: 'You', groupIds: ['g1', 'g2', 'g5'] }, groups).sort()).toEqual(['Jun', 'Maya', 'Priya', 'Sam', 'Theo'])
  })
  it('check what, when and who before sending', () => {
    expect(inviteErrors(draft, 'You', groups, NOW)).toEqual({})
    expect(Object.keys(inviteErrors({ ...draft, title: ' ' }, 'You', groups, NOW))).toEqual(['title'])
    expect(inviteErrors({ ...draft, start: '14:00', end: '13:00' }, 'You', groups, NOW).when).toBe('It has to end after it starts.')
    expect(inviteErrors({ ...draft, start: '09:00', end: '10:00' }, 'You', groups, NOW).when).toBe('That time is over.')
    expect(inviteErrors({ ...draft, date: '2026-12-01' }, 'You', groups, NOW).when).toBe('Open invites reach a week ahead at most.')
    expect(inviteErrors({ ...draft, groupIds: [] }, 'You', groups, NOW).groups).toBeTruthy()
    expect(inviteErrors({ ...draft, groupIds: ['g5'] }, 'You', groups, NOW).groups).toBe('You can only invite groups you are in.')
    expect(inviteErrors({ ...draft, title: 'x'.repeat(81) }, 'You', groups, NOW).title).toBeTruthy()
  })
  it('expire at their end time, campus clock', () => {
    const inv = makeInvite(draft, 'You', 'i1')
    expect(isExpired(inv, NOW)).toBe(false)
    expect(isExpired(inv, new Date('2026-11-24T22:00:00Z'))).toBe(true) // 2pm in Santa Clara
    expect(joinBlock({ ...inv, by: 'Maya' }, 'You', groups, new Date('2026-11-24T22:30:00Z'))).toBe('Over.')
  })
  it('let anyone reached say "I\'m in" once, and nobody else', () => {
    const inv = makeInvite(draft, 'Maya', 'i1')
    const a = join(inv, 'Jun', groups, NOW)
    expect(a.joins).toEqual(['Jun'])
    expect(join(a, 'Jun', groups, NOW).joins).toEqual(['Jun'])
    expect(joinBlock(a, 'Priya', groups, NOW)).toBe('Not in these groups.')
    expect(joinBlock(a, 'Maya', groups, NOW)).toBe('It is yours.')
    expect(leaveInvite(a, 'Jun').joins).toEqual([])
  })
  it('stay within the group limit, the sender included', () => {
    const big: SocialGroup[] = [{ id: 'gb', name: 'Big', members: ['You', ...Array.from({ length: 20 }, (_, i) => 'P' + i)] }]
    let inv = makeInvite({ ...draft, groupIds: ['gb'] }, 'You', 'i2')
    for (let i = 0; i < 20; i++) inv = join(inv, 'P' + i, big, NOW)
    expect(inv.joins.length).toBe(GROUP_LIMIT - 1)
  })
  it('become a plan only by the sender, once someone is in, in the group with most people in', () => {
    let inv = makeInvite({ ...draft, groupIds: ['g1', 'g2'] }, 'You', 'i3')
    expect(canMakePlan(inv, 'You', NOW)).toBe(false)
    inv = join(join(inv, 'Maya', groups, NOW), 'Jun', groups, NOW)
    expect(canMakePlan(inv, 'Maya', NOW)).toBe(false)
    expect(canMakePlan(inv, 'You', NOW)).toBe(true)
    expect(bestPlanGroup(inv, groups)).toBe('g1')
    const planned = markPlanned(inv, 'g1')
    expect(planned.status).toBe('planned')
    expect(join(planned, 'Theo', groups, NOW).joins).toEqual(['Maya', 'Jun'])
    expect(callOff(planned, 'You').status).toBe('planned')
    expect(callOff(inv, 'Maya').status).toBe('open')
    expect(callOff(inv, 'You').status).toBe('called-off')
  })
  it('show you your own and the open ones that reach you, soonest first', () => {
    const mine = makeInvite({ ...draft, start: '15:00', end: '16:00' }, 'You', 'a')
    const theirs = makeInvite(draft, 'Maya', 'b')
    const other = makeInvite({ ...draft, groupIds: ['g2'] }, 'Priya', 'c')
    const hidden = { ...makeInvite({ ...draft, groupIds: ['g5'] }, 'Ana', 'd') }
    expect(visibleInvites([mine, theirs, other, hidden], 'You', groups, NOW).map(i => i.id)).toEqual(['b', 'c', 'a'])
    expect(visibleInvites([theirs], 'Theo', groups, NOW).map(i => i.id)).toEqual(['b'])
    expect(visibleInvites([theirs], 'Priya', groups, NOW)).toEqual([])
  })
  it('carry no location: only what the sender typed', () => {
    const inv = makeInvite({ ...draft, place: '  ' }, 'You', 'i4')
    expect(Object.keys(inv).sort()).toEqual(['by', 'date', 'end', 'groupIds', 'id', 'joins', 'start', 'status', 'title'])
  })
})

describe('find a time', () => {
  const g = groups[0]
  const share = (person: string, slots: { date: string; start: string; end: string }[]): FreeShare => ({ person, groupId: 'g1', slots })
  it('shows only the overlap of everyone who shared, and names who did not', () => {
    const shares = [
      share('You', [{ date: '2026-11-24', start: '12:00', end: '15:00' }, { date: '2026-11-25', start: '17:00', end: '19:00' }]),
      share('Maya', [{ date: '2026-11-24', start: '13:00', end: '16:00' }, { date: '2026-11-25', start: '18:30', end: '20:00' }]),
      share('Jun', [{ date: '2026-11-24', start: '11:00', end: '14:30' }]),
    ]
    const c = commonTime(g, shares, 'You', NOW)
    expect(c.windows).toEqual([{ date: '2026-11-24', start: '13:00', end: '14:30' }])
    expect(c.shared).toEqual(['Maya', 'Jun', 'You'])
    expect(c.notShared).toEqual(['Theo'])
  })
  it('drops overlaps shorter than half an hour', () => {
    const c = commonTime(g, [share('You', [{ date: '2026-11-24', start: '12:00', end: '13:00' }]), share('Maya', [{ date: '2026-11-24', start: '12:40', end: '14:00' }])], 'You', NOW)
    expect(c.windows).toEqual([])
  })
  it('stays locked until you share too, so nobody browses others without giving theirs', () => {
    const c = commonTime(g, [share('Maya', [{ date: '2026-11-24', start: '12:00', end: '15:00' }]), share('Jun', [{ date: '2026-11-24', start: '12:00', end: '15:00' }])], 'You', NOW)
    expect(c.locked).toBe(true)
    expect(c.windows).toEqual([])
  })
  it('ignores shares from people outside the group and other groups', () => {
    const c = commonTime(g, [share('You', [{ date: '2026-11-24', start: '12:00', end: '15:00' }]),
      { person: 'Priya', groupId: 'g1', slots: [{ date: '2026-11-24', start: '20:00', end: '21:00' }] },
      { person: 'Maya', groupId: 'g2', slots: [{ date: '2026-11-24', start: '20:00', end: '21:00' }] }], 'You', NOW)
    expect(c.shared).toEqual(['You'])
    expect(c.windows).toEqual([])
  })
  it('keeps free/busy only: anything else in a slot is dropped, and only the next 7 days', () => {
    const slots = cleanSlots([
      { date: '2026-11-24', start: '12:00', end: '13:00', title: 'Therapy', place: 'Cowell' } as never,
      { date: '2026-11-24', start: '12:30', end: '14:00' },
      { date: '2026-12-05', start: '12:00', end: '13:00' },
      { date: '2026-11-20', start: '12:00', end: '13:00' },
      { date: '2026-11-25', start: '15:00', end: '14:00' },
    ], NOW)
    expect(slots).toEqual([{ date: '2026-11-24', start: '12:00', end: '14:00' }])
    expect(Object.keys(slots[0]).sort()).toEqual(['date', 'end', 'start'])
  })
  it('counts common windows per day for the beads', () => {
    const days = commonDays([{ date: '2026-11-24', start: '12:00', end: '13:00' }, { date: '2026-11-26', start: '12:00', end: '13:00' }], NOW)
    expect(days.map(d => d.count)).toEqual([1, 0, 1, 0, 0, 0, 0])
    expect(days[0].today).toBe(true)
  })
})

describe('demo social store', () => {
  it('starts with one friend\'s open invite and a notice, nothing shared', () => {
    const s = initialSocial([{ id: 'g1', name: 'Swig', members: ['Maya', 'Jun', 'You'] }], NOW)
    expect(s.invites).toHaveLength(1)
    expect(s.invites[0].start).toBe('11:00')
    expect(s.sharing).toEqual([])
    expect(unreadCount(s)).toBe(1)
    expect(unreadCount({ ...s, readAt: NOW.getTime() })).toBe(0)
  })
  it('round-trips through storage and refuses junk', () => {
    const mem = new Map<string, string>()
    const st = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v) } }
    const s = initialSocial(groups, NOW)
    writeSocial(s, st)
    expect(readSocial(st)).toEqual(s)
    mem.set('sidequest.demo-social.v1', '{"invites":"x"}')
    expect(readSocial(st)).toBeNull()
  })
  it('shares you only for groups you turned on; sample friends who keep it private are left out', () => {
    const mine = [{ date: '2026-11-24', start: '12:00', end: '14:00' }]
    const off = demoShares(groups, 'You', mine, [], NOW)
    expect(off.some(s => s.person === 'You')).toBe(false)
    const on = demoShares(groups, 'You', mine, ['g1'], NOW)
    expect(on.filter(s => s.person === 'You').map(s => s.groupId)).toEqual(['g1'])
    expect(on.some(s => SAMPLE_NOT_SHARING.includes(s.person))).toBe(false)
    expect(on.some(s => s.groupId === 'g5')).toBe(false)
  })
  it('sample friends join only when free for the whole invite', () => {
    const free = sampleFreeFor('Maya', NOW).find(s => s.date === '2026-11-24')!
    const inv = makeInvite({ ...draft, start: free.start, end: free.end }, 'You', 'x')
    expect(sampleJoiners(inv, groups, NOW)).toContain('Maya')
    expect(sampleJoiners(inv, groups, NOW)).not.toContain('Theo')
    expect(sampleJoiners({ ...inv, start: '08:00', end: '09:00' }, groups, NOW)).toEqual([])
  })
})
