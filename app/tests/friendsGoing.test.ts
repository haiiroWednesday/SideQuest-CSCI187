import { describe, expect, it } from 'vitest'
import { friendsGoing, STRANGER_MIN, type GoingGroup } from '../src/controller/friendsGoing'

const groups: GoingGroup[] = [
  { id: 'g1', members: ['Maya', 'Jun', 'You'], plans: [{ eventId: 'e1', status: 'proposed', answers: { Maya: 'works', Jun: 'if', You: null } }] },
  { id: 'g2', members: ['Priya', 'You'], plans: [{ eventId: 'e2', status: 'cancelled', answers: { Priya: 'works', You: 'works' } }] },
  // You were only invited here: its members stay hidden.
  { id: 'g5', members: ['Ana', 'Ben'], inviteFrom: 'Ana', plans: [{ eventId: 'e1', status: 'proposed', answers: { Ana: 'works', Ben: 'works' } }] },
]

describe('friendsGoing', () => {
  it('names only friends from your own groups who said Works', () => {
    const m = friendsGoing({ eventId: 'e1', you: 'You', groups, shares: [], total: 0 })
    expect(m?.friends).toEqual(['Maya'])
    expect(m?.friendsText).toBe('Maya is going')
  })

  it('never shows members of a group you are only invited to', () => {
    const m = friendsGoing({ eventId: 'e1', you: 'You', groups, shares: [{ name: 'Ben', groupId: 'g5', eventId: 'e1' }], total: 0 })
    expect(m?.friends).not.toContain('Ana')
    expect(m?.friends).not.toContain('Ben')
  })

  it('ignores If and Cannot answers and cancelled plans', () => {
    expect(friendsGoing({ eventId: 'e2', you: 'You', groups, shares: [], total: 0 })).toBeNull()
  })

  it('adds friends who chose to show a group, but only members of that group', () => {
    const m = friendsGoing({ eventId: 'e1', you: 'You', groups, total: 0, shares: [
      { name: 'Jun', groupId: 'g1', eventId: 'e1' },
      { name: 'Priya', groupId: 'g1', eventId: 'e1' },
    ] })
    expect(m?.friends).toEqual(['Maya', 'Jun'])
    expect(m?.friendsText).toBe('Maya + 1 friend')
  })

  it('shows strangers only as a count, and only from 5 going', () => {
    expect(friendsGoing({ eventId: 'e9', you: 'You', groups, shares: [], total: STRANGER_MIN - 1 })).toBeNull()
    const m = friendsGoing({ eventId: 'e9', you: 'You', groups, shares: [], total: STRANGER_MIN })
    expect(m?.friends).toEqual([])
    expect(m?.countText).toBe('5 going')
    expect(m?.friendsText).toBeNull()
  })

  it('carries no place or position', () => {
    const m = friendsGoing({ eventId: 'e1', you: 'You', groups, shares: [], total: 12 })
    expect(Object.keys(m ?? {}).sort()).toEqual(['countText', 'friends', 'friendsText', 'label'])
  })
})

describe('your "Show my friends I\'m going" choices', () => {
  const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v) }, m } }
  it('is off for every event until you turn it on, and keeps only event IDs', async () => {
    const { readGoingShares, setGoingShare, GOING_SHARE_KEY } = await import('../src/controller/friendsGoing')
    const s = mem()
    expect(readGoingShares(s)).toEqual([])
    expect(setGoingShare('e1', true, s)).toEqual(['e1'])
    expect(setGoingShare('e2', true, s)).toEqual(['e1', 'e2'])
    expect(setGoingShare('e1', false, s)).toEqual(['e2'])
    expect(JSON.parse(s.m.get(GOING_SHARE_KEY)!)).toEqual(['e2'])
  })
})
