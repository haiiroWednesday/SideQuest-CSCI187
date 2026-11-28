import { describe, expect, it } from 'vitest'
import {
  DIFFER_NONE, DIFFER_WALK_UNKNOWN, MAX_TICK_GAPS, goingCell, presentClashes, walkFromPlanBefore, whatDiffers,
  type ClashFacts,
} from '../src/controller/presentClash'
import type { ScreenEvent } from '../src/controller/screenModels'

// The clash chooser (Nov 25): under each ticket sit only the facts the clashing plans do not share,
// in one fixed order, so the choice is read row by row.
const facts = (over: Partial<ClashFacts> = {}): ClashFacts =>
  ({ endMin: 17 * 60, lengthMin: 120, overlap: '1 hr', walk: null, going: null, tags: [], ...over })
const keys = (plans: ClashFacts[]) => whatDiffers(plans).map(row => row.key)
const row = (plans: ClashFacts[], key: string) => whatDiffers(plans).find(r => r.key === key)?.cells

describe('what differs between clashing plans', () => {
  it('leaves out every fact both plans share', () => {
    const one = facts({ walk: '6 min from Chem lab', going: 'Maya', tags: ['Free food'] })
    expect(whatDiffers([one, { ...one }])).toEqual([])
  })

  it('treats the same words in another case or spacing as the same value', () => {
    expect(whatDiffers([facts({ walk: '6 min from Chem lab', going: 'Maya' }), facts({ walk: ' 6 min  from chem lab ', going: 'maya' })])).toEqual([])
  })

  it('shows a row only for the fact that differs', () => {
    expect(keys([facts(), facts({ endMin: 17 * 60 + 30, lengthMin: 120 })])).toEqual(['ends'])
    expect(keys([facts(), facts({ lengthMin: 90 })])).toEqual(['length'])
    expect(keys([facts({ going: 'Maya' }), facts({ going: 'Leo + 1 friend' })])).toEqual(['going'])
  })

  it('says "none" for the plan that lacks what the other has', () => {
    expect(row([facts({ going: 'Maya + 2 friends' }), facts()], 'going')).toEqual(['Maya + 2 friends', DIFFER_NONE])
    expect(row([facts(), facts({ tags: ['Free food'] })], 'tags')).toEqual([DIFFER_NONE, 'Free food'])
    expect(DIFFER_NONE).toBe('none')
  })

  it('skips Going when no plan has a friend going', () => {
    expect(keys([facts({ going: null }), facts({ going: '' }), facts()])).not.toContain('going')
  })

  it('lists only the tags the plans do not share', () => {
    const plans = [facts({ tags: ['Free food', 'RSVP'] }), facts({ tags: ['RSVP', 'Guest speaker'] })]
    expect(row(plans, 'tags')).toEqual(['Free food', 'Guest speaker'])
    expect(keys([facts({ tags: ['RSVP'] }), facts({ tags: ['RSVP'] })])).toEqual([])
  })

  it('a walk the map cannot give reads "not known", never "none"', () => {
    expect(row([facts({ walk: '6 min from Chem lab' }), facts()], 'walk')).toEqual(['6 min from Chem lab', DIFFER_WALK_UNKNOWN])
    expect(keys([facts(), facts()])).not.toContain('walk')
  })

  it('between two plans, Ends and Length name the gap from each side', () => {
    const choir = facts({ endMin: 17 * 60, lengthMin: 120 }), climbing = facts({ endMin: 17 * 60 + 30, lengthMin: 90 })
    expect(row([choir, climbing], 'ends')).toEqual(['30 min sooner', '30 min later'])
    expect(row([choir, climbing], 'length')).toEqual(['30 min longer', '30 min shorter'])
  })

  it('keeps one row order whatever differs, and one cell per plan in the plans\' order', () => {
    const a = facts({ endMin: 16 * 60, lengthMin: 60, overlap: '30 min', walk: '2 min from Lab', going: 'Maya', tags: ['Free food'] })
    const b = facts({ endMin: 17 * 60, lengthMin: 90, overlap: '45 min', walk: '9 min from Lab', going: null, tags: ['RSVP'] })
    const c = facts({ endMin: 18 * 60, lengthMin: 45, overlap: '15 min', walk: null, going: 'Leo', tags: [] })
    const order = ['ends', 'length', 'overlap', 'walk', 'going', 'tags']
    expect(keys([a, b, c])).toEqual(order)
    expect(keys([c, a, b])).toEqual(order)
    expect(whatDiffers([a, b, c]).map(r => r.label)).toEqual(['Ends', 'Length', 'Overlap', 'Walk', 'Going', 'Tags'])
    for (const r of whatDiffers([a, b, c])) expect(r.cells).toHaveLength(3)
    expect(row([a, b, c], 'going')).toEqual(['Maya', 'none', 'Leo'])
    expect(row([c, a, b], 'going')).toEqual(['Leo', 'Maya', 'none'])
  })

  it('among three or more, a row shows when at least one plan differs, measured from the first to end and the shortest', () => {
    const a = facts({ endMin: 11 * 60, lengthMin: 60, overlap: '1 hr' })
    const b = facts({ endMin: 12 * 60, lengthMin: 120, overlap: '1 hr 30 min' })
    const c = facts({ endMin: 11 * 60 + 30, lengthMin: 60, overlap: '1 hr' })
    expect(row([a, b, c], 'ends')).toEqual(['first', '1 hr later', '30 min later'])
    expect(row([a, b, c], 'length')).toEqual(['shortest', '1 hr longer', 'shortest'])
    expect(row([a, b, c], 'overlap')).toEqual(['1 hr', '1 hr 30 min', '1 hr'])
    expect(keys([a, { ...a }, { ...a }])).toEqual([])
    expect(keys([a, { ...a }, { ...a, going: 'Maya' }])).toEqual(['going'])
  })

  it('has nothing to compare for fewer than two plans', () => {
    expect(whatDiffers([])).toEqual([])
    expect(whatDiffers([facts({ going: 'Maya' })])).toEqual([])
  })
})

describe('friends going, as one cell', () => {
  const going = (friends: string[]) => ({ friends, friendsText: null, countText: null, label: '' })
  it('names the first friend and counts the rest', () => {
    expect(goingCell(going(['Maya']))).toBe('Maya')
    expect(goingCell(going(['Maya', 'Leo']))).toBe('Maya + 1 friend')
    expect(goingCell(going(['Maya', 'Leo', 'Ana']))).toBe('Maya + 2 friends')
  })
  it('is empty without friends, however many strangers are going', () => {
    expect(goingCell({ friends: [], friendsText: null, countText: '12 going', label: '12 going' })).toBeNull()
    expect(goingCell(null)).toBeNull()
  })
})

const NOW = new Date('2030-11-08T08:00:00-08:00')
const ev = (id: string, title: string, start: string, end: string, location: string, more: Partial<ScreenEvent> = {}): ScreenEvent =>
  ({ id, title, date: '2030-11-08', start, end, location, hostName: 'Club', ...more })

describe('the walk from the plan before', () => {
  const lab = ev('lab', 'Chem lab', '13:00', '14:00', 'Daly Science 207')
  const choir = ev('choir', 'Choir', '15:00', '17:00', 'Music and Dance Facility')
  const climbing = ev('climb', 'Climbing', '16:00', '17:30', 'Malley')
  it('is measured from the last plan that ends before this one starts, on the campus map', () => {
    expect(walkFromPlanBefore(choir, [lab, choir, climbing])).toMatch(/^\d+ min from Chem lab$/)
    // Choir is still running when Climbing starts, so Climbing is measured from Chem lab too.
    expect(walkFromPlanBefore(climbing, [lab, choir, climbing])).toMatch(/^\d+ min from Chem lab$/)
  })
  it('says when it is the same building', () => {
    expect(walkFromPlanBefore(ev('x', 'Recital', '15:00', '16:00', 'Recital hall, Music and Dance'), [ev('y', 'Warm-up', '14:00', '15:00', 'Music and Dance')])).toBe('Same building as Warm-up')
  })
  it('stays silent with no plan before, or a place the map does not know', () => {
    expect(walkFromPlanBefore(lab, [lab, choir, climbing])).toBeNull()
    expect(walkFromPlanBefore(ev('z', 'Boba', '15:00', '16:00', 'Somewhere off campus'), [lab])).toBeNull()
  })
})

describe('a clash, ready for the chooser', () => {
  const lab = ev('lab', 'Chem lab', '13:00', '14:00', 'Daly Science 207')
  const choir = ev('choir', 'Choir', '15:00', '17:00', 'Music and Dance Facility', { tags: ['free-food'] })
  const climbing = ev('climb', 'Climbing', '16:00', '17:30', 'Malley')
  const [clash] = presentClashes([lab, choir, climbing], NOW)

  it('gives each plan its own facts and the titles "Keep this one" removes', () => {
    expect(clash.plans.map(p => p.id)).toEqual(['choir', 'climb'])
    const [a, b] = clash.plans
    expect(a.facts).toMatchObject({ endMin: 17 * 60, lengthMin: 120, overlap: '1 hr', tags: ['Free food'] })
    expect(b.facts).toMatchObject({ endMin: 17 * 60 + 30, lengthMin: 90, overlap: '1 hr', tags: [] })
    expect(a.facts.walk).toMatch(/ min from Chem lab$/)
    expect(a.removes).toEqual(['Climbing'])
    expect(b.removes).toEqual(['Choir'])
  })

  it('compares into rows: the shared overlap is left out, the lone tag shows against "none"', () => {
    const rows = whatDiffers(clash.plans.map(p => p.facts))
    expect(rows.map(r => r.key)).toEqual(['ends', 'length', 'walk', 'tags'])
    expect(rows.find(r => r.key === 'tags')?.cells).toEqual(['Free food', 'none'])
  })

  it('in a chain, keeping one plan removes only the plans it overlaps', () => {
    const [chain] = presentClashes([
      ev('a', 'Hackathon', '13:00', '15:00', 'SCDI'), ev('b', 'Office hours', '14:30', '15:30', 'SCDI 1308'), ev('c', 'Boba run', '15:15', '16:00', 'Palm Drive'),
    ], NOW)
    expect(chain.plans.map(p => p.removes)).toEqual([['Office hours'], ['Hackathon', 'Boba run'], ['Office hours']])
  })

  it('marks at most five hours on the strip, and the strip ends on a mark', () => {
    const short = presentClashes([ev('a', 'A', '15:00', '17:00', ''), ev('b', 'B', '16:00', '17:30', '')], NOW)[0]
    expect(short.ticks.map(t => t.label)).toEqual(['3pm', '4pm', '5pm', '6pm'])
    const long = presentClashes([ev('a', 'A', '08:00', '21:00', ''), ev('b', 'B', '09:00', '10:00', '')], NOW)[0]
    expect(long.ticks.length).toBeLessThanOrEqual(MAX_TICK_GAPS + 1)
    expect(long.ticks.map(t => t.label)).toEqual(['8am', '12pm', '4pm', '8pm', '12am'])
    const five = presentClashes([ev('a', 'A', '11:00', '16:00', ''), ev('b', 'B', '12:00', '13:00', '')], NOW)[0]
    expect(five.ticks.map(t => t.label)).toEqual(['11am', '1pm', '3pm', '5pm'])
    expect(long.ticks[0].left).toBe(0)
    expect(long.ticks[long.ticks.length - 1].left).toBe(100)
    // Bars stay inside the strip.
    for (const p of long.plans) expect(p.left + p.width).toBeLessThanOrEqual(100)
  })
})
