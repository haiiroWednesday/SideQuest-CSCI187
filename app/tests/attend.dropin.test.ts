// How to attend (Nov 25): a host says whether an event starts at a set time or is drop-in.
// A set-time event fits free time exactly as before: the whole event inside it. A drop-in event
// also fits when it shares MIN_DROP_IN_MINUTES (20) or more with the free time.
// Model rule, catalog validation, storage adapters, fit mark words, fit line and "Our pick".
import { describe, expect, it, vi } from 'vitest'
import { createServer, type Server } from 'node:http'
import { createClient } from '@supabase/supabase-js'
import { ATTEND_CHOICES, ATTEND_ERROR, MIN_DROP_IN_MINUTES, attendOf, fitsFreeMinutes, isAttendMode, sharedMinutes } from '../src/model/attend'
import { assessEventFit, MIN_DROP_IN_MINUTES as RULE_MINUTES } from '../src/model/fitAssessment'
import { fitsFreeTime, fitsFully, hhmmOf, isCampusEvent, matchingEvents, validateEventDraft, type CampusEvent as LegacyEvent } from '../src/model/events'
import {
  DRAFT_FIELD_ORDER, catalogDraftErrors, catalogPostingErrors, createEventCatalog, fromEventRow, isCatalogEvent, toEventRow, trimDraft,
  type CampusEvent, type EventDraft, type EventRow,
} from '../src/model/eventCatalog'
import { createInMemoryEventTable } from '../src/model/inMemoryEventTable'
import { LOCAL_CATALOG_KEY, createBrowserEventTable } from '../src/model/browserEventTable'
import { ATTEND_COLUMN_MISSING, createSupabaseEventTable, isMissingAttendColumn, isMissingTagsColumn } from '../src/model/supabaseEventTable'
import { createHttpEventCatalog } from '../src/model/httpEventCatalog'
import { createCatalogApi } from '../server/api'
import { fitSpan, minutesShort, sharedOf } from '../src/model/fitMark'
import { findEvents } from '../src/controller/findEvents'
import { presentFitMark, withFitMarks } from '../src/controller/presentFitMark'
import { fitLineFor, presentDiscover } from '../src/controller/presentDiscover'
import { presentLeaveNotes, presentStretchAdvice } from '../src/controller/presentAdvice'
import { toStub, type ScreenEvent } from '../src/controller/screenModels'
import { eventsInWindow } from '../src/controller/groupsPreview'

// Tuesday 24 November 2026, 10:40 in Santa Clara.
const NOW = new Date('2026-11-24T18:40:00Z')
const DAY = '2026-11-24'
const free = (start: string, end: string, date = DAY) => ({ date, start, end })
const at = (start: string, end: string, attend?: 'set' | 'dropin') => ({ date: DAY, start, end, ...(attend ? { attend } : {}) })
const ev = (id: string, title: string, start: string, end: string, extra: Partial<ScreenEvent> = {}): ScreenEvent =>
  ({ id, title, date: DAY, start, end, hostName: 'Club', location: 'Benson', description: 'x', ...extra })

describe('the fit rule for a drop-in event', () => {
  const window = free('13:00', '14:00')
  it('names the minimum as a constant of 20 minutes', () => {
    expect(MIN_DROP_IN_MINUTES).toBe(20)
    expect(RULE_MINUTES).toBe(MIN_DROP_IN_MINUTES)
  })
  it.each([
    // The fair starts before the free hour and ends 19, 20 or 21 minutes into it.
    ['19 shared, ending inside', '11:00', '13:19', 19, false],
    ['20 shared, ending inside', '11:00', '13:20', 20, true],
    ['21 shared, ending inside', '11:00', '13:21', 21, true],
    // And the other side: it starts 19, 20 or 21 minutes before the free hour ends.
    ['19 shared, starting inside', '13:41', '16:00', 19, false],
    ['20 shared, starting inside', '13:40', '16:00', 20, true],
    ['21 shared, starting inside', '13:39', '16:00', 21, true],
  ])('%s', (_label, start, end, shared, fits) => {
    const fit = assessEventFit(at(start, end, 'dropin'), window)
    expect(fit.overlapMinutes).toBe(shared)
    expect(fit.kind).toBe(fits ? 'fits' : 'overlap')
    expect(fitsFreeTime(ev('a', 'Fair', start, end, { attend: 'dropin' }), DAY, window.start, window.end)).toBe(fits)
    // The same event as a set-time event never fits: part of it is outside the free hour.
    expect(assessEventFit(at(start, end), window).kind).toBe('overlap')
    expect(assessEventFit(at(start, end, 'set'), window).kind).toBe('overlap')
  })
  it('fits when the event is wholly inside the free time, however short it is', () => {
    expect(assessEventFit(at('13:10', '13:50', 'dropin'), window)).toEqual({ kind: 'fits', reason: 'The entire scheduled event fits your free time.', overlapMinutes: 40 })
    // Ten minutes of tabling inside a free hour: under 20 shared, and still all of it.
    expect(assessEventFit(at('13:10', '13:20', 'dropin'), window)).toMatchObject({ kind: 'fits', overlapMinutes: 10 })
    expect(assessEventFit(at('13:00', '14:00', 'dropin'), window)).toMatchObject({ kind: 'fits', overlapMinutes: 60 })
  })
  it('fits when the event is longer than the free time on both sides, and shares all of it', () => {
    const short = free('13:10', '13:55')
    expect(assessEventFit(at('11:00', '15:00', 'dropin'), short)).toEqual({
      kind: 'fits', reason: 'Drop in any time. You are free for 45 minutes of it.', overlapMinutes: 45,
    })
    // A free stretch shorter than the minimum cannot be dropped in on, even by a day-long fair.
    expect(assessEventFit(at('11:00', '15:00', 'dropin'), free('13:10', '13:29'))).toMatchObject({ kind: 'overlap', overlapMinutes: 19 })
    expect(assessEventFit(at('11:00', '15:00', 'dropin'), free('13:10', '13:30')).kind).toBe('fits')
  })
  it('is a miss like any other when too little is shared, and says why', () => {
    const miss = assessEventFit(at('11:00', '13:15', 'dropin'), window)
    expect(miss).toEqual({
      kind: 'overlap', overlapMinutes: 15,
      reason: 'Drop in any time, but you are free for only 15 minutes of it. Stopping by takes at least 20 minutes.',
    })
    expect(assessEventFit(at('11:00', '13:00', 'dropin'), window)).toMatchObject({ kind: 'outside', overlapMinutes: 0 })
    expect(assessEventFit({ ...at('13:10', '13:50', 'dropin'), date: '2026-11-25' }, window).kind).toBe('outside')
    expect(assessEventFit({ date: DAY, start: '13:10', end: null, attend: 'dropin' }, window).kind).toBe('unknown')
  })
  it('leaves set-time events exactly as they were, with or without the field', () => {
    for (const attend of [undefined, 'set'] as const) {
      expect(assessEventFit(at('13:00', '14:00', attend), window)).toEqual({ kind: 'fits', reason: 'The entire scheduled event fits your free time.', overlapMinutes: 60 })
      const over = assessEventFit(at('13:30', '14:30', attend), window)
      expect(over.kind).toBe('overlap')
      expect(over.reason).toBe('Overlaps for 30 minutes but ends 30 minutes after your free time. Late arrival or early departure has not been verified.')
      expect(assessEventFit(at('12:00', '15:00', attend), window).kind).toBe('overlap')
      expect(assessEventFit(at('14:00', '15:00', attend), window).kind).toBe('outside')
    }
  })
  it('treats anything but "dropin" as a set-time event, so nothing is ever guessed', () => {
    expect(attendOf({})).toBe('set')
    expect(attendOf({ attend: 'set' })).toBe('set')
    expect(attendOf({ attend: 'dropin' })).toBe('dropin')
    for (const odd of ['drop-in', 'DROPIN', 'fair', '', null, 1, true]) expect(attendOf({ attend: odd })).toBe('set')
    // A title that sounds drop-in changes nothing.
    expect(findEvents([ev('a', 'Volunteer fair, drop in any time', '11:00', '15:00')], DAY, '13:10', '13:55').matches).toEqual([])
    expect(isAttendMode('dropin') && isAttendMode('set')).toBe(true)
    expect(isAttendMode('fair') || isAttendMode(undefined)).toBe(false)
    expect(ATTEND_CHOICES).toEqual([{ id: 'set', label: 'Starts at a set time' }, { id: 'dropin', label: 'Drop in any time' }])
  })
  it('has one rule: the filter, the explanation and the minute arithmetic agree on every case', () => {
    const times = [600, 615, 640, 659, 660, 661, 679, 680, 681, 700, 720, 721, 740, 780]
    const windows = [[660, 720], [660, 679], [660, 680], [640, 700]]
    let cases = 0, dropInOnly = 0
    for (const attend of ['set', 'dropin'] as const) for (const [from, to] of windows) for (const start of times) for (const end of times) {
      if (end <= start) continue
      const event = ev('a', 'Event', hhmmOf(start), hhmmOf(end), { attend })
      const byRule = fitsFreeMinutes(attend, start, end, from, to)
      const byFilter = findEvents([event], DAY, hhmmOf(from), hhmmOf(to)).matches.length === 1
      const byAssessment = assessEventFit(event, free(hhmmOf(from), hhmmOf(to))).kind === 'fits'
      const inside = from <= start && end <= to
      expect([byFilter, byAssessment]).toEqual([byRule, byRule])
      expect(byRule).toBe(inside || (attend === 'dropin' && sharedMinutes(start, end, from, to) >= 20))
      // The strict helper ignores the mode, and a set-time event fits only when it says so.
      expect(fitsFully(event, DAY, hhmmOf(from), hhmmOf(to))).toBe(inside)
      if (attend === 'set') expect(byRule).toBe(inside)
      if (byRule && !inside) dropInOnly++
      cases++
    }
    expect(cases).toBeGreaterThan(600)
    expect(dropInOnly).toBeGreaterThan(50)
  })
  it('sorts drop-in matches with the rest, by start time', () => {
    const events = [ev('talk', 'Talk', '13:15', '13:45'), ev('fair', 'Fair', '11:00', '15:00', { attend: 'dropin' }), ev('long', 'Long talk', '11:00', '15:00')] as LegacyEvent[]
    expect(matchingEvents(events, free('13:10', '13:55')).map(e => e.id)).toEqual(['fair', 'talk'])
    // Groups ask the same rule for a common window.
    expect(eventsInWindow(events, free('13:10', '13:55')).map(e => e.id)).toEqual(['talk', 'fair'])
  })
})

describe('attend in the catalog model', () => {
  const clock = () => new Date('2030-11-07T17:00:00Z')
  const draft = (extra: Partial<EventDraft> = {}): EventDraft => ({
    title: 'Volunteer fair', hostName: 'Ignatian Center', description: 'Meet local groups.', location: 'Locatelli Center',
    date: '2030-11-14', start: '11:00', end: '15:00', ...extra,
  })
  it('stores "dropin" and gives it back, for every reader', async () => {
    const table = createInMemoryEventTable()
    const catalog = createEventCatalog(table, clock)
    const created = await catalog.create(draft({ attend: 'dropin' }))
    expect(created.attend).toBe('dropin')
    expect(isCatalogEvent(created)).toBe(true)
    expect([...table.rows.values()][0].attend).toBe('dropin')
    expect((await catalog.getById(created.id))?.attend).toBe('dropin')
    expect((await catalog.listUpcoming())[0].attend).toBe('dropin')
  })
  it('keeps a set-time event in the shape events had before the field', async () => {
    const table = createInMemoryEventTable()
    const catalog = createEventCatalog(table, clock)
    for (const attend of [undefined, 'set'] as const) {
      const created = await catalog.create(draft(attend ? { attend } : {}))
      expect(created).not.toHaveProperty('attend')
    }
    for (const row of table.rows.values()) expect(row).not.toHaveProperty('attend')
    expect(toEventRow(trimDraft(draft({ attend: 'set' })))).not.toHaveProperty('attend')
  })
  it('refuses any other value in the model, so catalog.create cannot bypass it', async () => {
    const table = createInMemoryEventTable()
    const catalog = createEventCatalog(table, clock)
    for (const bad of ['fair', 'drop-in', '', 1, true, null, ['dropin']]) {
      expect(catalogDraftErrors(draft({ attend: bad as never })).attend).toBe(ATTEND_ERROR)
      expect(catalogPostingErrors(draft({ attend: bad as never }), clock()).attend).toBe(ATTEND_ERROR)
      await expect(catalog.create(draft({ attend: bad as never }))).rejects.toMatchObject({ kind: 'invalid', message: ATTEND_ERROR })
    }
    expect(table.rows.size).toBe(0)
    expect(catalogDraftErrors(draft({ attend: 'dropin' }))).toEqual({})
    expect(catalogDraftErrors(draft())).toEqual({})
    expect(isCatalogEvent({ ...draft(), id: 'x', attend: 'fair' })).toBe(false)
    expect(isCatalogEvent({ ...draft(), id: 'x', attend: 'dropin' })).toBe(true)
    expect(DRAFT_FIELD_ORDER).toContain('attend')
  })
  it('reads an old or imported row, or an unknown stored value, as a set-time event', () => {
    const row: EventRow = { id: '33333333-3333-4333-8333-333333333333', title: 'Old', host_name: 'X', description: 'd', location: 'Benson',
      event_date: '2030-11-14', start_time: '11:00:00', end_time: '15:00:00' }
    expect(fromEventRow(row)).not.toHaveProperty('attend')
    expect(fromEventRow({ ...row, attend: null })).not.toHaveProperty('attend')
    expect(fromEventRow({ ...row, attend: 'set' })).not.toHaveProperty('attend')
    expect(fromEventRow({ ...row, attend: 'anything' })).not.toHaveProperty('attend')
    expect(fromEventRow({ ...row, attend: 'dropin' }).attend).toBe('dropin')
    // So an imported fair with no field does not fit a short gap, whatever its title says.
    const imported: CampusEvent = { ...fromEventRow({ ...row, title: 'Drop-in volunteer fair', source: 'scu-calendar' }) }
    expect(findEvents([imported], '2030-11-14', '13:10', '13:55').matches).toEqual([])
  })
  it('validates the field in the historical M1 model too', () => {
    const base = { title: 'Fair', location: 'Benson', date: '2030-11-14', start: '11:00', end: '15:00' }
    const now = new Date(2030, 10, 7, 9, 0)
    expect(validateEventDraft({ ...base, attend: 'dropin' }, 'a', [], now).event).toMatchObject({ attend: 'dropin' })
    expect(validateEventDraft({ ...base, attend: 'set' }, 'a', [], now).event).not.toHaveProperty('attend')
    expect(validateEventDraft(base, 'a', [], now).event).not.toHaveProperty('attend')
    expect(validateEventDraft({ ...base, attend: 'fair' as never }, 'a', [], now)).toEqual({ event: null, error: ATTEND_ERROR })
    expect(isCampusEvent({ ...base, id: 'a' })).toBe(true)
    expect(isCampusEvent({ ...base, id: 'a', attend: 'dropin' })).toBe(true)
    expect(isCampusEvent({ ...base, id: 'a', attend: 'fair' })).toBe(false)
  })
})

describe('attend in storage', () => {
  const clock = () => new Date('2030-11-07T17:00:00Z')
  const draft: EventDraft = { title: 'Open studio', hostName: 'Printmaking Club', description: 'Come and print.', location: 'Dowd Art Building',
    date: '2030-11-14', start: '18:30', end: '20:00', attend: 'dropin' }
  const ID = '22222222-2222-4222-8222-222222222222'
  const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
  const supabase = (fetcher: typeof fetch, warn: (message: string) => void) => createEventCatalog(createSupabaseEventTable(
    createClient('https://sidequest-http.test', 'sb_publishable_fixture', { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: fetcher } }), warn), clock)

  it('the browser table keeps it across a reload', async () => {
    const saved = new Map<string, string>()
    const storage = { getItem: (key: string) => saved.get(key) ?? null, setItem: (key: string, value: string) => { saved.set(key, value) } }
    const created = await createEventCatalog(createBrowserEventTable(storage, () => ID), clock).create(draft)
    expect(created.attend).toBe('dropin')
    expect(JSON.parse(saved.get(LOCAL_CATALOG_KEY)!)[0].attend).toBe('dropin')
    // A second catalog over the same storage is a reload.
    expect((await createEventCatalog(createBrowserEventTable(storage), clock).getById(ID))?.attend).toBe('dropin')
  })
  it('recognises only a missing attend column', () => {
    expect(isMissingAttendColumn({ code: '42703', message: 'column events.attend does not exist' })).toBe(true)
    expect(isMissingAttendColumn({ code: 'PGRST204', message: "Could not find the 'attend' column of 'events' in the schema cache" })).toBe(true)
    expect(isMissingAttendColumn({ code: '42703', message: 'column events.tags does not exist' })).toBe(false)
    expect(isMissingAttendColumn({ code: '42703', message: 'column events.attendance does not exist' })).toBe(false)
    expect(isMissingAttendColumn({ code: '42501', message: 'permission denied for attend' })).toBe(false)
    expect(isMissingAttendColumn(null)).toBe(false)
    expect(isMissingTagsColumn({ code: '42703', message: 'column events.attend does not exist' })).toBe(false)
  })
  it('keeps posting and reading when the live table has no attend column, with one schema line', async () => {
    const bodies: Record<string, unknown>[] = [], selects: string[] = []
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      const request = new Request(input, init)
      const select = new URL(request.url).searchParams.get('select') ?? ''
      selects.push(select)
      if (/attend/.test(select)) return response({ code: '42703', message: 'column events.attend does not exist' }, 400)
      if (request.method === 'GET') return response([])
      const body = await request.json() as Record<string, unknown>
      bodies.push(body)
      return response({ ...body, id: ID, start_time: '18:30:00', end_time: '20:00:00' }, 201)
    })
    const warn = vi.fn()
    const catalog = supabase(fetcher, warn)
    const created = await catalog.create(draft)
    expect(created.id).toBe(ID)
    // The post is saved as a set-time event: the strict reading, never a guess.
    expect(created).not.toHaveProperty('attend')
    expect(bodies.at(-1)).not.toHaveProperty('attend')
    expect(selects.at(-1)).not.toMatch(/attend/)
    expect(selects.at(-1)).toMatch(/,tags,tags_by$/)
    expect(await catalog.listUpcoming()).toEqual([])
    await catalog.create(draft)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith(ATTEND_COLUMN_MISSING)
    expect(ATTEND_COLUMN_MISSING).toMatch(/^Schema check: public\.events has no attend column\. Apply supabase\/proposals\/20261126000000_event_attend_REVIEW_ONLY\.sql\./)
    // Only the first request was refused and retried.
    expect(selects.filter(select => /attend/.test(select))).toHaveLength(1)
  })
  it('drops all three optional column groups when none exists yet', async () => {
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      const request = new Request(input, init)
      const select = new URL(request.url).searchParams.get('select') ?? ''
      if (/accessibility/.test(select)) return response({ code: '42703', message: 'column events.accessibility does not exist' }, 400)
      if (/tags/.test(select)) return response({ code: '42703', message: 'column events.tags does not exist' }, 400)
      if (/attend/.test(select)) return response({ code: 'PGRST204', message: "Could not find the 'attend' column of 'events' in the schema cache" }, 400)
      return response([])
    })
    const warn = vi.fn()
    const table = createSupabaseEventTable(createClient('https://sidequest-http.test', 'sb_publishable_fixture', {
      auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: fetcher } }), warn)
    expect(await table.checkSchema()).toEqual({ access: false, tags: false, attend: false })
    expect(warn).toHaveBeenCalledTimes(3)
    expect(warn.mock.calls.every(([message]) => /^Schema check: /.test(message))).toBe(true)
  })
  it('writes and reads the column once it exists', async () => {
    const bodies: Record<string, unknown>[] = [], selects: string[] = []
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      const request = new Request(input, init)
      selects.push(new URL(request.url).searchParams.get('select') ?? '')
      const body = await request.json() as Record<string, unknown>
      bodies.push(body)
      return response({ ...body, id: ID, start_time: '18:30:00', end_time: '20:00:00' }, 201)
    })
    const warn = vi.fn()
    const catalog = supabase(fetcher, warn)
    expect((await catalog.create(draft)).attend).toBe('dropin')
    expect(bodies[0].attend).toBe('dropin')
    expect(selects[0]).toMatch(/,attend$/)
    expect(await catalog.create({ ...draft, attend: 'set' })).not.toHaveProperty('attend')
    expect(bodies[1]).not.toHaveProperty('attend')
    expect(warn).not.toHaveBeenCalled()
  })
})

describe('attend through the server API', () => {
  it('accepts the two values and refuses anything else with the model message', async () => {
    const table = createInMemoryEventTable()
    const api = createCatalogApi(createEventCatalog(table))
    const server: Server = createServer((req, res) => { void api(req, res).then(handled => { if (!handled) { res.writeHead(404); res.end() } }) })
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    try {
      const address = server.address(); if (!address || typeof address === 'string') throw Error('No address')
      const url = `http://127.0.0.1:${address.port}`
      const soon = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10)
      const draft = { title: 'Volunteer fair', hostName: 'Ignatian Center', description: 'Meet local groups.', location: 'Locatelli Center', date: soon, start: '11:00', end: '15:00' }
      const fetcher: typeof fetch = (input, init) => fetch(url + String(input), init)
      const created = await createHttpEventCatalog(fetcher).create({ ...draft, attend: 'dropin' })
      expect(created.attend).toBe('dropin')
      expect((await createHttpEventCatalog(fetcher).getById(created.id))?.attend).toBe('dropin')
      const post = (value: unknown) => fetch(url + '/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) })
      const refused = await post({ ...draft, attend: 'fair' })
      expect(refused.status).toBe(400)
      expect(await refused.json()).toEqual({ error: ATTEND_ERROR })
      expect(table.rows.size).toBe(1)
    } finally {
      await new Promise<void>(resolve => server.close(() => resolve()))
    }
  })
})

describe('the fit mark for a drop-in event', () => {
  const fair = at('11:00', '15:00', 'dropin')
  it('measures a drop-in event against the stretch it shares the most with', () => {
    const windows = [free('11:30', '11:50'), free('13:10', '13:55'), free('14:50', '16:00')]
    const span = fitSpan(fair, windows)
    expect(span).toEqual({ kind: 'fits', freeStart: 790, freeEnd: 835, eventStart: 660, eventEnd: 900, early: 130, over: 65, spare: 0, dropIn: true })
    expect(sharedOf(span!)).toBe(45)
    expect(minutesShort(span!)).toBe(0)
    // A stretch it only misses is never chosen over one it fits.
    expect(fitSpan(fair, [free('14:50', '16:00'), free('11:30', '11:50')])).toMatchObject({ kind: 'fits', freeStart: 690, freeEnd: 710 })
  })
  it('counts a miss by the free minutes still needed, not by the hours outside', () => {
    const span = fitSpan(fair, [free('14:45', '16:00'), free('10:00', '11:05')])
    expect(span).toMatchObject({ kind: 'overlap', freeStart: 885, freeEnd: 960, dropIn: true })
    expect(sharedOf(span!)).toBe(15)
    expect(minutesShort(span!)).toBe(5)
    // A set-time event still needs every minute that sticks out.
    const set = fitSpan(at('11:00', '15:00'), [free('14:45', '16:00')])!
    expect(set).not.toHaveProperty('dropIn')
    expect(minutesShort(set)).toBe(225)
  })
  it('says what the student gets in at most three words, and as a sentence', () => {
    const mark = presentFitMark(fair, [free('13:10', '13:55')])
    expect(mark).toEqual({
      kind: 'fits', dropIn: true, label: 'Drop in 45 min', say: 'Drop in for up to 45 min of your free time, 1:10–1:55pm.',
      freeStart: 790, freeEnd: 835, eventStart: 660, eventEnd: 900,
      // Drawn the same way: the free stretch, the event inside it, and the event either side.
      free: { left: 54.2, width: 18.7 }, inside: { left: 54.2, width: 18.7 }, outside: [{ left: 0, width: 54.2 }, { left: 72.9, width: 27.1 }],
    })
    for (const [start, end, label] of [['13:00', '13:20', 'Drop in 20 min'], ['13:00', '14:00', 'Drop in 1 hr'], ['12:00', '15:00', 'Drop in 3 hr']] as const) {
      expect(presentFitMark(fair, [free(start, end)])?.label).toBe(label)
    }
    // "Drop in" and one amount.
    expect(presentFitMark(fair, [free('13:10', '13:55')])!.label.replace(/\d+ (min|hr)$/, 'N').split(' ')).toHaveLength(3)
  })
  it('caps the minutes by the event when the free time is longer than it', () => {
    const studio = at('18:30', '19:00', 'dropin')
    const mark = presentFitMark(studio, [free('18:00', '21:00')])
    expect(mark).toMatchObject({ kind: 'fits', dropIn: true, label: 'Drop in 30 min', say: 'Drop in for up to 30 min of your free time, 6–9pm.', outside: [] })
    // Sticking out on one side only.
    expect(presentFitMark(at('18:30', '20:00', 'dropin'), [free('19:00', '19:45')])).toMatchObject({ label: 'Drop in 45 min' })
    expect(presentFitMark(at('18:30', '20:00', 'dropin'), [free('18:00', '19:10')])).toMatchObject({ label: 'Drop in 40 min' })
  })
  it('says how little is shared when a drop-in event misses', () => {
    expect(presentFitMark(fair, [free('14:45', '16:00')])).toMatchObject({
      kind: 'over', dropIn: true, label: 'Only 15 min', say: 'You are free for only 15 min of it, 2:45–4pm. Dropping in takes at least 20 min.',
    })
    expect(presentFitMark(fair, [free('15:00', '16:00')])).toBeNull()
    expect(presentFitMark(fair, [free('15:00', '16:00')], 'say')).toMatchObject({ kind: 'outside', label: 'Not free then' })
  })
  it('leaves the marks of set-time events as they were', () => {
    expect(presentFitMark(at('13:15', '13:45'), [free('13:10', '13:55')])).toEqual({
      kind: 'fits', label: '15 min spare', say: 'Fits your free time, 1:10–1:55pm, with 15 min spare.',
      freeStart: 790, freeEnd: 835, eventStart: 795, eventEnd: 825,
      free: { left: 0, width: 100 }, inside: { left: 11.1, width: 66.7 }, outside: [],
    })
    expect(presentFitMark(at('11:00', '15:00', 'set'), [free('13:10', '13:55')])).toMatchObject({ kind: 'over', label: '3 hr 15 min over' })
    expect(presentFitMark(at('11:00', '15:00', 'set'), [free('13:10', '13:55')])).not.toHaveProperty('dropIn')
  })
})

describe('Discover with drop-in events', () => {
  const fair = ev('fair', 'Volunteer fair', '11:00', '15:00', { attend: 'dropin' })
  const talk = ev('talk', 'Lunch talk', '13:15', '13:45')
  const long = ev('long', 'Long workshop', '11:00', '15:00')
  const tabling = ev('tab', 'Club tabling', '11:00', '13:25', { attend: 'dropin' })
  const events = [fair, talk, long, tabling]
  const shown = (screen: ReturnType<typeof presentDiscover>) => screen.days.flatMap(day => day.events)

  it('keeps a drop-in event in the list for marked free time, with its own words', () => {
    const screen = presentDiscover({ events, freeWindows: [free('13:10', '13:55')], now: NOW })
    expect(shown(screen).map(stub => stub.id)).toEqual(['fair', 'talk'])
    expect(screen.fitLine).toBe('2 events fit your free time')
    expect(shown(screen)[0].fitMark).toMatchObject({ label: 'Drop in 45 min', dropIn: true })
    expect(shown(screen)[1].fitMark).toMatchObject({ label: '15 min spare' })
  })
  it('uses the same rule for the typed free window and its near-miss lines', () => {
    const screen = presentDiscover({ events, freeWindow: free('13:10', '13:55'), now: NOW })
    expect(shown(screen).map(stub => stub.id)).toEqual(['fair', 'talk'])
    expect(screen.freeWindow?.fitText).toBe('2 fit')
    // The fair fits, so it is no near miss. Tabling shares 15 minutes and the workshop is set-time.
    expect(screen.nearMisses.map(miss => miss.id)).toEqual(['tab', 'long'])
    expect(screen.nearMisses[0].reason).toBe('Drop in any time, but you are free for only 15 minutes of it. Stopping by takes at least 20 minutes.')
    expect(screen.nearMisses[1].reason).toMatch(/Late arrival or early departure has not been verified/)
  })
  it('names a drop-in near miss by what is shared when nothing fits', () => {
    const windows = [free('13:10', '13:25')]
    expect(fitLineFor([tabling, long], 0, windows)).toBe('Nothing fits. Club tabling shares only 15 min with your free time.')
    // It needs 5 more free minutes. A set-time event that needs fewer is still the nearer one.
    const nearly = ev('n', 'Short talk', '13:08', '13:25')
    expect(fitLineFor([tabling, nearly], 0, windows)).toBe("Nothing fits. Short talk starts 2 min before you're free.")
    expect(fitLineFor([long], 0, windows)).toBe('Nothing fits. Long workshop runs 3 hr 45 min longer than your free time.')
  })
  it('gives a drop-in ticket its words, and a set-time ticket none', () => {
    const planned = new Set<string>()
    expect(toStub(fair, NOW, planned, null).dropIn).toEqual({ label: 'Drop in', name: 'drop in any time', line: 'Drop in any time between 11am and 3pm.' })
    expect(toStub(ev('s', 'Open studio', '18:30', '20:00', { attend: 'dropin' }), NOW, planned, null).dropIn?.line).toBe('Drop in any time between 6:30pm and 8pm.')
    expect(toStub(talk, NOW, planned, null)).not.toHaveProperty('dropIn')
    expect(toStub({ ...talk, attend: 'set' }, NOW, planned, null)).not.toHaveProperty('dropIn')
    // The length is still there for the screens that use it.
    expect(toStub(fair, NOW, planned, null).durationText).toBe('4 hr')
  })
  it('marks every ticket from the student\'s own week by the same rule', () => {
    const screen = withFitMarks(presentDiscover({ events: [fair, long], now: NOW }), [{ date: DAY, known: true, windows: [free('13:10', '13:55')] }])
    const [first, second] = shown(screen)
    expect(first.fitMark).toMatchObject({ kind: 'fits', label: 'Drop in 45 min' })
    expect(second.fitMark).toMatchObject({ kind: 'over', label: '3 hr 15 min over' })
  })
})

describe('"Our pick" with drop-in events', () => {
  const window = { ...free('13:10', '13:55'), label: '1:10–1:55pm' }
  const fair = ev('fair', 'Volunteer fair', '11:00', '15:00', { attend: 'dropin', location: 'Locatelli Center' })
  it('can pick a drop-in event that runs past the free time, showing its own hours', () => {
    const [advice] = presentStretchAdvice({ events: [fair, ev('long', 'Long workshop', '11:00', '15:00')], windows: [window], plannedIds: [], now: NOW })
    expect(advice.count).toBe(1)
    expect(advice.pick).toMatchObject({ id: 'fair', title: 'Volunteer fair', time: '11:00am to 3:00pm', reason: 'The one event that fits this free time' })
    expect(advice.plan).toBeNull()
  })
  it('does not say a fair that opened hours ago "starts first"', () => {
    const talk = ev('talk', 'Lunch talk', '13:20', '13:50', { location: 'Kenna Hall' })
    const [advice] = presentStretchAdvice({ events: [fair, talk], windows: [window], plannedIds: [], now: NOW })
    expect(advice.count).toBe(2)
    expect(advice.pick).toMatchObject({ id: 'fair', reason: 'Open when your free time starts' })
  })
  it('keeps a fair that runs past the free time out of a chain, so "Plan all" never plans a clash', () => {
    const wide = { ...free('12:00', '17:00'), label: '12–5pm' }
    const a = ev('a', 'Glean Team', '12:00', '13:00', { location: 'Forge Garden' })
    const b = ev('b', 'Ethics panel', '13:30', '14:30', { location: 'Lucas Hall' })
    const [advice] = presentStretchAdvice({ events: [fair, a, b], windows: [wide], plannedIds: [], now: NOW })
    expect(advice.count).toBe(3)
    expect(advice.plan?.ids).toEqual(['a', 'b'])
    // A drop-in event wholly inside the stretch is attended like any other and can chain.
    const studio = ev('s', 'Open studio', '15:00', '16:00', { attend: 'dropin', location: 'Lucas Hall' })
    const [withStudio] = presentStretchAdvice({ events: [a, b, studio], windows: [wide], plannedIds: [], now: NOW })
    expect(withStudio.plan?.ids).toEqual(['a', 'b', 's'])
  })
  it('can pick a drop-in event that is already on, never a set-time one', () => {
    // 10:40 now. Both started at 10:00 and run to noon.
    const jam = ev('jam', 'Study jam', '10:00', '12:00', { attend: 'dropin' })
    const lecture = ev('lec', 'Lecture', '10:00', '12:00')
    const now = { ...free('10:40', '11:30'), label: '10:40–11:30am' }
    const advice = presentStretchAdvice({ events: [jam, lecture], windows: [now], plannedIds: [], now: NOW })
    expect(advice.map(item => item.pick.id)).toEqual(['jam'])
  })
  it('gives a drop-in ticket no walking note: the student picks when to come and go', () => {
    const dinner = ev('d', 'Dinner', '17:00', '18:00', { location: 'Benson' })
    const nourish = ev('n', 'Nourish Nights', '18:00', '19:00', { location: 'Forge Garden' })
    expect(presentLeaveNotes({ events: [dinner, nourish], fittingIds: ['n'], plannedIds: ['d'] }).has('n')).toBe(true)
    expect(presentLeaveNotes({ events: [dinner, { ...nourish, attend: 'dropin' }], fittingIds: ['n'], plannedIds: ['d'] }).has('n')).toBe(false)
  })
})
