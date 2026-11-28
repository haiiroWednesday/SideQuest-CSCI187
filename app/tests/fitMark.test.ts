// The fit mark on a ticket (Nov 25): one small bar that answers "does this fit my free time?"
// The Model measures an event against the free stretch around it, on top of the one strict
// full-fit rule. The Controller turns the minutes into a few words, a sentence and a drawing.
import { describe, expect, it } from 'vitest'
import { assessEventFit } from '../src/model/fitAssessment'
import { fitSpan } from '../src/model/fitMark'
import { missText, presentFitMark, withFitMarks, type FitDay } from '../src/controller/presentFitMark'
import { fitLineFor, presentDiscover } from '../src/controller/presentDiscover'
import { addBusy, freeWindows, presentMarks, type MarkInput } from '../src/controller/freeMarks'
import type { CampusEvent } from '../src/model/eventCatalog'

// Tuesday 24 November 2026, 10:40 in Santa Clara.
const NOW = new Date('2026-11-24T18:40:00Z')
const DAY = '2026-11-24'
const NEXT = '2026-11-25'
const free = (start: string, end: string, date = DAY) => ({ date, start, end })
const at = (start: string, end: string, date = DAY) => ({ date, start, end })
const ev = (id: string, title: string, start: string, end: string, date = DAY): CampusEvent =>
  ({ id, title, date, start, end, hostName: 'Club', location: 'Benson', description: 'x' })

describe('fitSpan: the stretch an event is measured against, in minutes', () => {
  it('gives the free stretch, the event and the spare minutes when the event is inside', () => {
    expect(fitSpan(at('13:15', '13:45'), [free('13:10', '13:55')])).toEqual({
      kind: 'fits', freeStart: 790, freeEnd: 835, eventStart: 795, eventEnd: 825, early: 0, over: 0, spare: 15,
    })
  })
  it('has no spare minutes when the event fills the stretch exactly', () => {
    expect(fitSpan(at('13:10', '13:55'), [free('13:10', '13:55')])).toMatchObject({ kind: 'fits', spare: 0, early: 0, over: 0 })
  })
  it('counts the minutes after the stretch as over and the minutes before it as early', () => {
    expect(fitSpan(at('13:30', '14:30'), [free('13:10', '13:55')])).toMatchObject({ kind: 'overlap', early: 0, over: 35, spare: 0 })
    expect(fitSpan(at('13:00', '13:40'), [free('13:10', '13:55')])).toMatchObject({ kind: 'overlap', early: 10, over: 0 })
    expect(fitSpan(at('12:00', '14:00'), [free('13:10', '13:55')])).toMatchObject({ kind: 'overlap', early: 70, over: 5 })
  })
  it('picks the stretch the event fits inside, wherever it is in the list', () => {
    const windows = [free('09:00', '10:15'), free('10:00', '12:00'), free('11:30', '13:00')]
    expect(fitSpan(at('10:00', '11:00'), windows)).toMatchObject({ kind: 'fits', freeStart: 600, freeEnd: 720 })
  })
  it('otherwise picks the overlapping stretch that leaves the fewest minutes outside', () => {
    // 11:00 to 4:00 against 11–1 (3 hr over) and 2:30–5 (3 hr 30 min early): the first is nearer.
    const windows = [free('14:30', '17:00'), free('11:00', '13:00')]
    expect(fitSpan(at('11:00', '16:00'), windows)).toMatchObject({ kind: 'overlap', freeStart: 660, freeEnd: 780, over: 180, early: 0 })
  })
  it('is null when the event touches no free stretch that day, or has no usable end', () => {
    expect(fitSpan(at('15:00', '16:00'), [free('13:10', '13:55')])).toBeNull()
    expect(fitSpan(at('13:55', '14:30'), [free('13:10', '13:55')])).toBeNull()
    expect(fitSpan(at('13:15', '13:45'), [free('13:10', '13:55', NEXT)])).toBeNull()
    expect(fitSpan({ date: DAY, start: '13:15', end: null }, [free('13:10', '13:55')])).toBeNull()
    expect(fitSpan(at('13:15', '13:45'), [])).toBeNull()
  })
  it('never calls something a fit that the strict full-fit rule does not', () => {
    const window = free('13:10', '13:55')
    for (const [start, end] of [['13:10', '13:55'], ['13:15', '13:45'], ['13:05', '13:55'], ['13:10', '14:00'], ['12:00', '13:10'], ['14:00', '15:00']]) {
      const span = fitSpan(at(start, end), [window])
      expect(span?.kind === 'fits').toBe(assessEventFit(at(start, end), window).kind === 'fits')
    }
  })
})

describe('presentFitMark: the words, the sentence and the drawing', () => {
  it('says how much time is spare when it is tight, with every number the bar needs', () => {
    expect(presentFitMark(at('13:15', '13:45'), [free('13:10', '13:55')])).toEqual({
      kind: 'fits', label: '15 min spare', say: 'Fits your free time, 1:10–1:55pm, with 15 min spare.',
      freeStart: 790, freeEnd: 835, eventStart: 795, eventEnd: 825,
      free: { left: 0, width: 100 }, inside: { left: 11.1, width: 66.7 }, outside: [],
    })
  })
  it('says "Fits exactly" when the event fills the stretch', () => {
    const mark = presentFitMark(at('19:00', '19:45'), [free('19:00', '19:45')])
    expect(mark).toMatchObject({ kind: 'fits', label: 'Fits exactly', say: 'Fits exactly. It fills your free time, 7–7:45pm.' })
    expect(mark?.inside).toEqual({ left: 0, width: 100 })
  })
  it('only says "Fits" when an hour or more is spare', () => {
    expect(presentFitMark(at('19:00', '20:00'), [free('18:00', '21:00')])).toMatchObject({ label: 'Fits', say: 'Fits your free time, 6–9pm.' })
    expect(presentFitMark(at('18:00', '20:01'), [free('18:00', '21:00')])?.label).toBe('59 min spare')
  })
  it('draws an overrun past the gold end, to scale, and gives the minutes', () => {
    // Free 1:10 to 1:55, event 1:30 to 2:30: the bar runs 1:10 to 2:30 (80 min).
    expect(presentFitMark(at('13:30', '14:30'), [free('13:10', '13:55')])).toEqual({
      kind: 'over', label: '35 min over', say: 'Runs 35 min over your free time, 1:10–1:55pm.',
      freeStart: 790, freeEnd: 835, eventStart: 810, eventEnd: 870,
      free: { left: 0, width: 56.3 }, inside: { left: 25, width: 31.3 }, outside: [{ left: 56.3, width: 43.7 }],
    })
  })
  it('draws an early start before the gold start', () => {
    const mark = presentFitMark(at('10:30', '11:30'), [free('11:00', '13:00')])
    expect(mark).toMatchObject({ kind: 'over', label: '30 min early', say: "Starts 30 min before you're free, 11am–1pm." })
    expect(mark?.free).toEqual({ left: 20, width: 80 })
    expect(mark?.outside).toEqual([{ left: 0, width: 20 }])
  })
  it('draws both ends when the event is longer than the stretch', () => {
    const mark = presentFitMark(at('12:00', '14:00'), [free('13:10', '13:55')])
    expect(mark).toMatchObject({ kind: 'over', label: '1 hr 15 min over', say: 'Runs 1 hr 15 min longer than your free time, 1:10–1:55pm.' })
    expect(mark?.outside).toHaveLength(2)
  })
  it('keeps the label to three words or fewer for anything under an hour', () => {
    const marks = [
      presentFitMark(at('13:15', '13:45'), [free('13:10', '13:55')]),
      presentFitMark(at('13:10', '13:55'), [free('13:10', '13:55')]),
      presentFitMark(at('13:30', '14:30'), [free('13:10', '13:55')]),
      presentFitMark(at('13:00', '13:40'), [free('13:10', '13:55')]),
      presentFitMark(at('19:00', '20:00'), [free('18:00', '21:00')]),
      presentFitMark(at('15:00', '16:00'), [free('13:10', '13:55')], 'say'),
    ]
    for (const mark of marks) {
      expect(mark!.label.split(' ').length).toBeLessThanOrEqual(3)
      expect(mark!.label + mark!.say).not.toMatch(/[—;]/)
    }
  })
  it('shows nothing for an event outside every stretch unless asked to say so', () => {
    expect(presentFitMark(at('15:00', '16:00'), [free('13:10', '13:55')])).toBeNull()
    expect(presentFitMark(at('15:00', '16:00'), [free('13:10', '13:55')], 'say')).toEqual({
      kind: 'outside', label: 'Not free then', say: 'Not free then. It is outside your free time.',
      freeStart: null, freeEnd: null, eventStart: 900, eventEnd: 960,
      free: null, inside: null, outside: [{ left: 0, width: 100 }],
    })
    expect(presentFitMark({ date: DAY, start: '15:00', end: null }, [free('13:10', '13:55')], 'say')).toBeNull()
  })
})

describe('one fit rule: the fit line and the mark use the same near miss', () => {
  const climbing = ev('climb', 'Climbing Club Intro', '13:30', '14:30')
  const lunch = ev('lunch', 'Long lunch', '12:00', '14:00')
  const windows = [free('13:10', '13:55')]
  it('names the same minutes in the line under the day bar and on the ticket', () => {
    expect(fitLineFor([climbing, lunch], 0, windows)).toBe('Nothing fits. Climbing Club Intro runs 35 min over.')
    expect(presentFitMark(climbing, windows)?.say).toBe('Runs 35 min over your free time, 1:10–1:55pm.')
    expect(missText(0, 35)).toBe('runs 35 min over')
    expect(missText(10, 0)).toBe("starts 10 min before you're free")
    expect(missText(10, 35)).toBe('runs 45 min longer than your free time')
  })
  it('keeps the fit line as it was for the other cases', () => {
    expect(fitLineFor([climbing], 1, windows)).toBe('1 event fits your free time')
    expect(fitLineFor([climbing], 3, windows)).toBe('3 events fit your free time')
    expect(fitLineFor([ev('late', 'Late show', '20:00', '21:00')], 0, windows)).toBe('Nothing fits your free time')
    // Two equal misses: the earlier event is named.
    expect(fitLineFor([ev('b', 'Second', '13:30', '14:05'), ev('a', 'First', '13:00', '13:40')], 0, windows)).toBe("Nothing fits. First starts 10 min before you're free.")
  })
})

describe('the mark on Discover tickets', () => {
  const talk = ev('talk', 'Quick talk', '13:15', '13:45')
  const climbing = ev('climb', 'Climbing Club Intro', '13:30', '14:30')
  const tomorrow = ev('tom', 'Tomorrow thing', '13:15', '13:45', NEXT)
  const stubs = (screen: ReturnType<typeof presentDiscover>) => screen.days.flatMap(day => day.events)

  it('is on every ticket the free-time filter kept, from the same stretches', () => {
    const screen = presentDiscover({ events: [talk, climbing], freeWindows: [free('13:10', '13:55')], now: NOW })
    expect(stubs(screen).map(stub => [stub.title, stub.fit, stub.fitMark?.label])).toEqual([['Quick talk', 'fits', '15 min spare']])
  })
  it('comes from the typed free window too', () => {
    const screen = presentDiscover({ events: [talk, climbing], freeWindow: free('13:00', '13:45'), now: NOW })
    expect(stubs(screen).map(stub => stub.fitMark?.label)).toEqual(['15 min spare'])
  })
  it('is left out when no free time is known, and the ticket still carries its own clock times', () => {
    const screen = presentDiscover({ events: [talk, climbing], now: NOW })
    expect(stubs(screen).map(stub => stub.fitMark)).toEqual([undefined, undefined])
    expect(stubs(screen)[0].clock).toEqual({ start: '13:15', end: '13:45' })
  })

  const days: FitDay[] = [
    { date: DAY, known: true, windows: [free('13:10', '13:55')] },
    { date: NEXT, known: false, windows: [free('08:00', '23:00', NEXT)] },
  ]
  it('marks an unfiltered list from the week: inside, overrun, outside, and nothing on an unknown day', () => {
    const late = ev('late', 'Late show', '20:00', '21:00')
    const screen = withFitMarks(presentDiscover({ events: [talk, climbing, late, tomorrow], now: NOW }), days)
    expect(stubs(screen).map(stub => [stub.title, stub.fitMark?.label ?? null])).toEqual([
      ['Quick talk', '15 min spare'], ['Climbing Club Intro', '35 min over'], ['Late show', 'Not free then'], ['Tomorrow thing', null],
    ])
  })
  it('leaves planned and under-way events without a mark, and keeps a mark the filter already set', () => {
    const live = ev('live', 'Under way', '10:00', '13:30')
    const screen = withFitMarks(presentDiscover({ events: [talk, climbing, live], plannedIds: ['climb'], now: NOW }), days)
    expect(stubs(screen).map(stub => [stub.title, stub.fitMark?.label ?? null])).toEqual([['Under way', null], ['Quick talk', '15 min spare'], ['Climbing Club Intro', null]])
    const filtered = presentDiscover({ events: [talk], freeWindows: [free('13:00', '14:00')], now: NOW })
    expect(stubs(withFitMarks(filtered, days))[0].fitMark?.label).toBe('30 min spare')
  })
  it('changes nothing without a week', () => {
    const screen = presentDiscover({ events: [talk], now: NOW })
    expect(withFitMarks(screen, undefined)).toBe(screen)
    expect(withFitMarks(screen, [])).toBe(screen)
  })
})

describe('the week the day bar hands to the mark', () => {
  const plan = ev('plan', 'Seminar', '12:00', '13:00')
  const base: MarkInput = { events: [plan], plannedIds: ['plan'], now: NOW, marks: {}, open: {}, mode: 'busy' }
  const dayOf = (input: MarkInput, date: string) => presentMarks(input).fitDays.find(day => day.date === date)!

  it('covers seven days, and knows a day once it holds a plan or a busy mark', () => {
    const week = presentMarks(base).fitDays
    expect(week).toHaveLength(7)
    expect(week.map(day => day.known)).toEqual([true, false, false, false, false, false, false])
    const marked = { ...base, marks: addBusy({ ...base, date: NEXT }, '19:00', '21:00')! }
    expect(dayOf(marked, NEXT).known).toBe(true)
  })
  it('gives the same free stretches Discover filters by', () => {
    const marked = { ...base, marks: addBusy({ ...base, date: DAY }, '19:00', '21:00')! }
    expect(presentMarks(marked).fitDays.flatMap(day => day.windows)).toEqual(freeWindows(marked))
    // 10:40 now, a seminar at noon and a shift from 7 to 9.
    expect(dayOf(marked, DAY).windows).toEqual([free('10:40', '12:00'), free('13:00', '19:00'), free('21:00', '23:59')])
  })
  it('in Free mode knows a day only once free time is marked on it', () => {
    const freeMode: MarkInput = { ...base, mode: 'free' }
    expect(dayOf(freeMode, DAY)).toEqual({ date: DAY, known: false, windows: [] })
    const open = addBusy({ ...freeMode, marks: {}, date: DAY }, '13:10', '13:55')!
    expect(dayOf({ ...freeMode, open }, DAY)).toEqual({ date: DAY, known: true, windows: [free('13:10', '13:55')] })
    expect(dayOf({ ...freeMode, open }, NEXT).known).toBe(false)
  })
})
