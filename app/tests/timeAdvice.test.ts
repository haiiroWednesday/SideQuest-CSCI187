import { describe, expect, it } from 'vitest'
import { walkBetween, placeLabelFor, WALK_ESTIMATE_LABEL } from '../src/model/walkEstimate'
import { leaveNotes, onePick, planStretch, clock, type TimedPlace } from '../src/controller/timeAdvice'
import { normalizeTags, hasAllTags, TAG_ERROR } from '../src/model/eventTags'
import { postFoodNotice, activeFoodNotices, minutesLeft, FOOD_NOTICE_MINUTES } from '../src/model/foodNow'

const D = '2026-11-24'
const ev = (id: string, title: string, location: string, start: string, end: string, date = D): TimedPlace => ({ id, title, location, date, start, end })
const benson = walkBetween('Benson', 'Forge Garden')

describe('walk estimates from the campus map graph', () => {
  it('matches locations the way the map does', () => {
    expect(placeLabelFor('Benson Center patio')).toBe('Benson')
    expect(placeLabelFor('Library, 2nd floor')).toBe('Library')
    expect(placeLabelFor('SCDI 1308')).toBe('SCDI')
    expect(placeLabelFor('Somewhere off campus')).toBeNull()
  })
  it('gives whole minutes rounded up, and zero inside one building', () => {
    expect(benson.status).toBe('ready')
    if (benson.status === 'ready') expect(benson.minutes).toBe(Math.ceil(benson.metres / 80))
    const same = walkBetween('SCDI 1308', 'SCDI 1302')
    expect(same).toMatchObject({ status: 'ready', minutes: 0 })
  })
  it('says unknown for a place it cannot find, never a guess', () => {
    expect(walkBetween('Benson', 'a friend\'s apartment')).toEqual({ status: 'unknown', reason: 'unknown-place' })
  })
})

describe('leave by', () => {
  const walk = benson.status === 'ready' ? benson.minutes : 0
  it('tells you when to leave for the next plan elsewhere', () => {
    const event = ev('a', 'Nourish Nights', 'Benson', '16:00', '17:00')
    const next = ev('b', 'Garden shift', 'Forge Garden', '17:20', '18:30')
    const { notes, label } = leaveNotes(event, [next])
    expect(label).toBe(WALK_ESTIMATE_LABEL)
    expect(notes).toEqual([{ kind: 'leave-by', at: clock(17 * 60 + 20 - walk), to: 'Garden shift', walkMinutes: walk,
      text: `Leave by ${clock(17 * 60 + 20 - walk)} for Garden shift, ${walk} min walk` }])
  })
  it('says plainly when back-to-back plans make you late, without changing the fit', () => {
    const event = ev('a', 'Nourish Nights', 'Benson', '16:00', '17:00')
    const next = ev('b', 'Chem lab', 'Forge Garden', '17:00', '18:00')
    const { notes } = leaveNotes(event, [next])
    expect(notes[0]).toMatchObject({ kind: 'late-next', lateMinutes: walk, text: `Fits, but you'd be ${walk} min late to Chem lab` })
  })
  it('warns when the walk from the plan before makes you arrive late', () => {
    const before = ev('p', 'Garden shift', 'Forge Garden', '15:00', '16:00')
    const { notes } = leaveNotes(ev('a', 'Nourish Nights', 'Benson', '16:00', '17:00'), [before])
    expect(notes[0]).toMatchObject({ kind: 'late-start', lateMinutes: walk })
  })
  it('stays quiet when the next plan is hours away', () => {
    const event = ev('a', 'Nourish Nights', 'Benson', '16:00', '17:00')
    expect(leaveNotes(event, [ev('b', 'Open Mic', 'Forge Garden', '21:00', '22:00')]).notes).toEqual([])
  })
  it('gives no note in the same building, for unknown places, or with nothing next', () => {
    expect(leaveNotes(ev('a', 'Python lab', 'SCDI 1302', '11:00', '12:00'), [ev('b', 'Hack', 'SCDI 1308', '12:00', '13:00')]).notes).toEqual([])
    expect(leaveNotes(ev('a', 'X', 'Benson', '11:00', '12:00'), [ev('b', 'Y', 'Starbucks downtown', '12:00', '13:00')]).notes).toEqual([])
    expect(leaveNotes(ev('a', 'X', 'Benson', '11:00', '12:00'), [ev('b', 'Y', 'Forge Garden', '12:00', '13:00', '2026-11-25')]).notes).toEqual([])
  })
})

describe('one pick per free stretch', () => {
  const window = { date: D, start: '12:00', end: '17:00' }
  const lunch = ev('p', 'Lunch talk', 'Kenna Hall', '11:00', '12:00')
  const near = ev('n', 'Ethics panel', 'Lucas Hall', '14:00', '15:00')
  const far = ev('f', 'Glean Team', 'Forge Garden', '12:30', '13:30')
  it('prefers the closest walk from the plan before', () => {
    const pick = onePick([far, near], window, [lunch])!
    expect(pick.event.id).toBe(pickClosest([far, near], 'Kenna Hall'))
    expect(pick.event.id).toBe('n') // Lucas is next to Kenna; the Forge Garden is across campus
    expect(pick.reason).toMatch(/walk from Lunch talk|same building as Lunch talk/i)
  })
  it('falls back to the soonest start when nothing is known about where you are', () => {
    const pick = onePick([near, far], window, [])!
    expect(pick.event.id).toBe('f')
    expect(pick.reason).toBe('Starts first in this free time')
  })
  it('only picks events inside the stretch, and none when nothing fits', () => {
    expect(onePick([ev('x', 'Late', 'Benson', '16:30', '17:30')], window, [])).toBeNull()
    expect(onePick([], window, [])).toBeNull()
  })
})
function pickClosest(list: TimedPlace[], from: string) {
  return list.map(e => ({ e, w: (walkBetween(from, e.location) as { minutes: number }).minutes }))
    .sort((a, b) => a.w - b.w || a.e.start.localeCompare(b.e.start))[0].e.id
}

describe('plan my afternoon', () => {
  const window = { date: D, start: '12:00', end: '18:00' }
  it('chains events with room to walk between them and never overlaps', () => {
    const a = ev('a', 'Glean Team', 'Forge Garden', '12:00', '13:00')
    const b = ev('b', 'Ethics panel', 'Lucas Hall', '13:30', '14:30')
    const c = ev('c', 'Clash', 'Benson', '14:00', '15:00')
    const d = ev('d', 'Nourish Nights', 'Benson', '16:00', '17:00')
    const plan = planStretch([d, c, b, a], window)!
    expect(plan.label).toBe(WALK_ESTIMATE_LABEL)
    expect(plan.stops.length).toBeGreaterThanOrEqual(3)
    for (let i = 1; i < plan.stops.length; i++) {
      const prev = plan.stops[i - 1].event, cur = plan.stops[i]
      const end = Number(prev.end.slice(0, 2)) * 60 + Number(prev.end.slice(3))
      const start = Number(cur.event.start.slice(0, 2)) * 60 + Number(cur.event.start.slice(3))
      expect(end + (cur.walkBefore ?? 0)).toBeLessThanOrEqual(start)
    }
    expect(plan.stops[0].walkBefore).toBeNull()
  })
  it('skips a hop the walk makes impossible', () => {
    const a = ev('a', 'Glean Team', 'Forge Garden', '12:00', '13:00')
    const b = ev('b', 'Nourish Nights', 'Benson', '13:00', '14:00')
    expect(planStretch([a, b], window)).toBeNull()
  })
  it('needs two events, and only chains unknown places inside the same place', () => {
    expect(planStretch([ev('a', 'One', 'Benson', '12:00', '13:00')], window)).toBeNull()
    const x = ev('x', 'A', 'Off-campus cafe', '12:00', '13:00'), y = ev('y', 'B', 'Off-campus cafe', '13:00', '14:00')
    expect(planStretch([x, y], window)!.stops.map(s => s.event.id)).toEqual(['x', 'y'])
    const z = ev('z', 'C', 'Another cafe', '14:30', '15:00')
    expect(planStretch([x, z], window)).toBeNull()
  })
})

describe('event tags', () => {
  it('keeps known tags once each in catalog order', () => {
    expect(normalizeTags(['off-campus', 'free-food', 'free-food'])).toEqual(['free-food', 'off-campus'])
    expect(normalizeTags(undefined)).toEqual([])
    expect(normalizeTags(['free-food', 'pizza'])).toBeNull()
    expect(normalizeTags('free-food')).toBeNull()
    expect(TAG_ERROR).toMatch(/free food/)
  })
  it('filters on every chosen tag', () => {
    expect(hasAllTags({ tags: ['free-food', 'guest-speaker'] }, ['free-food'])).toBe(true)
    expect(hasAllTags({ tags: ['free-food'] }, ['free-food', 'guest-speaker'])).toBe(false)
    expect(hasAllTags({}, [])).toBe(true)
  })
})

describe('food now', () => {
  const at = (h: number, m: number) => new Date(Date.UTC(2026, 10, 24, h + 8, m)) // PST
  const live = { id: 'e', date: D, start: '16:00', end: '17:00' }
  it('lets the host share while the event is happening, for 30 minutes', () => {
    const result = postFoodNotice({ notices: [], event: live, postedByHost: true, now: at(16, 40) })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(activeFoodNotices(result.notices, at(17, 9))).toHaveLength(1)
    expect(minutesLeft(result.notice, at(17, 0))).toBe(FOOD_NOTICE_MINUTES - 20)
    expect(activeFoodNotices(result.notices, at(17, 10))).toHaveLength(0)
  })
  it('refuses anyone but the host, events not happening now, and quick repeats', () => {
    expect(postFoodNotice({ notices: [], event: live, postedByHost: false, now: at(16, 30) })).toEqual({ ok: false, reason: 'not-yours' })
    expect(postFoodNotice({ notices: [], event: live, postedByHost: true, now: at(15, 59) })).toEqual({ ok: false, reason: 'not-happening' })
    expect(postFoodNotice({ notices: [], event: live, postedByHost: true, now: at(17, 0) })).toEqual({ ok: false, reason: 'not-happening' })
    const first = postFoodNotice({ notices: [], event: live, postedByHost: true, now: at(16, 10) })
    if (!first.ok) throw new Error('first share failed')
    expect(postFoodNotice({ notices: first.notices, event: live, postedByHost: true, now: at(16, 15) })).toEqual({ ok: false, reason: 'too-soon' })
    const again = postFoodNotice({ notices: first.notices, event: live, postedByHost: true, now: at(16, 25) })
    expect(again.ok && again.notices).toHaveLength(1)
  })
})
