// CONTROLLER: My Schedule, Someday and busy time for a signed-in student.
// The rules (limits, overlap warnings, idea statuses, free-time cells) are the same ones the
// device-only app uses. Only where things are kept changes: the PersonalStorePort, which in the
// app is the /api/me server adapter. A change shows once the server has saved it, or is undone
// with a message when it was refused.
import { createSharedScheduleController, type SharedScheduleResult } from './sharedSchedule'
import { CELL, CELLS, DAY_START, undoChange, type FreeMarks } from './freeMarks'
import type { SomedayResult } from './someday'
import type { EventCatalogPort } from '../model/eventCatalog'
import { PLANNED_IDS_KEY, type PlanStorage } from '../model/schedule'
import { addIntention, linkIntention, setIntentionStatus, type Intention, type IntentionStatus } from '../model/someday'
import { hhmmOf, toMinutes } from '../model/events'
import { PersonalStoreError, type BusyDraft, type BusyRange, type PersonalStorePort } from '../model/personalData'

const problem = (error: unknown, fallback: string) => error instanceof PersonalStoreError ? error.message : fallback

// ---------- My Schedule

export function createAccountScheduleController(catalog: EventCatalogPort, store: PersonalStorePort) {
  let ids: string[] = []
  let loaded = false
  let queue = Promise.resolve()
  function run(action: () => Promise<SharedScheduleResult>) {
    const result = queue.then(action)
    queue = result.then(() => {}, () => {})
    return result
  }
  // The shared controller keeps every rule; it reads and writes this list instead of localStorage.
  const memory: PlanStorage = {
    getItem: key => key === PLANNED_IDS_KEY ? JSON.stringify(ids) : null,
    setItem: (key, value) => { if (key === PLANNED_IDS_KEY) ids = JSON.parse(value) as string[] },
  }
  const shared = createSharedScheduleController(catalog, () => memory)
  async function pull(): Promise<string | null> {
    try { ids = await store.listPlans(); loaded = true; return null }
    catch (error) { return problem(error, 'Your saved plans could not be loaded. Try again.') }
  }
  async function change(apply: () => Promise<SharedScheduleResult>, save: () => Promise<void>) {
    if (!loaded) {
      const error = await pull()
      if (error) return { ...(await shared.read()), error }
    }
    const before = [...ids]
    const result = await apply()
    if (before.join() === ids.join()) return result
    try { await save(); return result }
    catch (error) {
      ids = before
      return { ...(await shared.read()), error: problem(error, 'Your change was not saved. Try again.'), message: null, warning: null }
    }
  }
  return {
    initial(): SharedScheduleResult { return { ...shared.initial(), loading: true } },
    read: () => run(async () => {
      const error = await pull()
      const result = await shared.read()
      return error ? { ...result, error } : result
    }),
    add: (id: string) => run(() => change(() => shared.add(id), async () => {
      await store.addPlan(id)
    })),
    remove: (id: string) => run(() => change(() => shared.remove(id), async () => {
      await store.removePlan(id)
    })),
    /** Nothing on the server can be unreadable the way a damaged browser list can; reload instead. */
    recover(): Promise<SharedScheduleResult> { return this.read() },
    handlesStorageChange: (_event: StorageEvent) => false,
  }
}

// ---------- Someday

export type AccountSomedayStep = { now: SomedayResult; saved: Promise<SomedayResult> | null }

export function createAccountSomedayController(store: PersonalStorePort) {
  let items: Intention[] = []
  let pending = 0
  // Ideas saved while a reload is in flight; the reload's older answer must not drop them.
  let savedDuringLoad: Set<string> | null = null
  const ok = (): SomedayResult => ({ items: [...items], blocked: false, error: null })
  const refused = (error: string): SomedayResult => ({ items: [...items], blocked: false, error })
  const isPending = (id: string) => id.startsWith('pending-')

  // The last version of each idea the server confirmed, and the newest edit asked for on it.
  // A refused edit puts back only its own idea, and only when no newer edit to it is on the way;
  // every other idea, and every later edit, stays as it is.
  const confirmed = new Map<string, Intention>()
  const newest = new Map<string, number>()
  let edits = 0
  function update(id: string, check: (list: readonly Intention[]) => { items: Intention[]; error: string | null }, send: () => Promise<Intention>): AccountSomedayStep {
    if (isPending(id)) return { now: refused('Still saving this idea. Try again in a moment.'), saved: null }
    const next = check(items)
    if (next.error) return { now: refused(next.error), saved: null }
    const edit = ++edits
    newest.set(id, edit)
    const shown = items.find(item => item.id === id)
    if (shown && !confirmed.has(id)) confirmed.set(id, shown)
    items = next.items
    const saved = send()
      .then(row => {
        confirmed.set(row.id, row)
        // The server's row is the truth once the newest edit to it is saved.
        if (newest.get(id) === edit) items = items.map(item => item.id === row.id ? row : item)
        return ok()
      })
      .catch(error => {
        const back = confirmed.get(id)
        if (newest.get(id) === edit && back) items = items.map(item => item.id === id ? back : item)
        return refused(problem(error, 'Your change was not saved. Try again.'))
      })
    return { now: ok(), saved }
  }

  return {
    initial: (): SomedayResult => ({ items: [], blocked: false, error: null }),
    async load(): Promise<SomedayResult> {
      const saved = savedDuringLoad = new Set<string>()
      try {
        const fresh = await store.listIdeas()
        const keep = items.filter(item => isPending(item.id) || saved.has(item.id))
        items = [...keep, ...fresh.filter(row => !keep.some(item => item.id === row.id))]
        for (const row of fresh) confirmed.set(row.id, row)
        return ok()
      }
      catch (error) { return refused(problem(error, 'Your Someday ideas could not be loaded. Try again.')) }
    },
    add(title: string, note: string): AccountSomedayStep {
      const temp = `pending-${++pending}`
      const next = addIntention(items, title, note, temp)
      if (next.error) return { now: refused(next.error), saved: null }
      items = next.items
      const saved = store.addIdea({ title: title.trim(), note: note.trim(), source: 'typed' })
        .then(row => { items = items.map(item => item.id === temp ? row : item); confirmed.set(row.id, row); savedDuringLoad?.add(row.id); return ok() })
        .catch(error => { items = items.filter(item => item.id !== temp); return refused(problem(error, 'This idea was not saved. Try again.')) })
      return { now: ok(), saved }
    },
    link: (id: string, eventId: string | null) => update(id, list => linkIntention(list, id, eventId),
      () => store.updateIdea(id, { eventId, status: eventId ? 'ready' : 'saved' })),
    setStatus: (id: string, status: IntentionStatus) => update(id, list => setIntentionStatus(list, id, status),
      () => store.updateIdea(id, { status })),
  }
}

// ---------- Busy time

const hhmm = hhmmOf
const toMin = (t: string) => toMinutes(t) ?? NaN
const cellsOf = (row: { start: string; end: string }) => {
  const a = toMin(row.start), b = toMin(row.end), out: number[] = []
  for (let i = 0; i < CELLS; i++) { const s = DAY_START + i * CELL; if (s < b && s + CELL > a) out.push(i) }
  return out
}

/** Saved busy stretches become the half-hour cells Discover draws. */
export function rangesToMarks(rows: readonly Pick<BusyRange, 'date' | 'start' | 'end'>[]): FreeMarks {
  const out: Record<string, Set<number>> = {}
  for (const row of rows) for (const cell of cellsOf(row)) (out[row.date] ??= new Set()).add(cell)
  return Object.fromEntries(Object.entries(out).map(([date, cells]) => [date, [...cells].sort((a, b) => a - b)]))
}

/** Runs of marked cells, each one stretch to save. */
export function marksToRanges(marks: FreeMarks): Omit<BusyDraft, 'source'>[] {
  const out: Omit<BusyDraft, 'source'>[] = []
  for (const [date, cells] of Object.entries(marks).sort()) {
    let first = -1, last = -2
    for (const cell of [...cells].sort((a, b) => a - b)) {
      if (cell === last + 1) { last = cell; continue }
      if (first >= 0) out.push({ date, start: hhmm(DAY_START + first * CELL), end: hhmm(DAY_START + (last + 1) * CELL) })
      first = last = cell
    }
    if (first >= 0) out.push({ date, start: hhmm(DAY_START + first * CELL), end: hhmm(DAY_START + (last + 1) * CELL) })
  }
  return out
}

/**
 * What to change on the server so it matches the bar. A saved stretch stays as long as every
 * cell it touches is still busy, so an imported 9:15 class is never rewritten as 9:00.
 */
export function planBusySync(rows: readonly BusyRange[], marks: FreeMarks): { remove: BusyRange[]; add: BusyDraft[] } {
  const marked = (date: string, cell: number) => (marks[date] ?? []).includes(cell)
  // Imported or spoken stretches keep their exact times while the bar still covers them.
  const kept = rows.filter(row => row.source !== 'typed' && cellsOf(row).every(cell => marked(row.date, cell)))
  const covered = rangesToMarks(kept)
  const uncovered: Record<string, number[]> = {}
  for (const [date, cells] of Object.entries(marks)) {
    const left = cells.filter(cell => !(covered[date] ?? []).includes(cell))
    if (left.length) uncovered[date] = left
  }
  // Typed stretches are redrawn from the bar, so joining two drags saves one stretch.
  const wanted = marksToRanges(uncovered)
  const same = (row: BusyRange, range: Omit<BusyDraft, 'source'>) => row.date === range.date && row.start === range.start && row.end === range.end
  const typedKept = rows.filter(row => row.source === 'typed' && wanted.some(range => same(row, range)))
  return {
    remove: rows.filter(row => !kept.includes(row) && !typedKept.includes(row)),
    add: wanted.filter(range => !typedKept.some(row => same(row, range))).map(range => ({ ...range, source: 'typed' as const })),
  }
}

/** The steps that came from Google Calendar, so a View can colour them apart. Display only: saving never reads it. */
export function calendarMarksOf(rows: readonly BusyRange[]): FreeMarks {
  return rangesToMarks(rows.filter(row => row.source === 'calendar'))
}

/** Keeps only the calendar steps the bar still marks busy, after a drag took some away. */
export function calendarWithin(calendar: FreeMarks, marks: FreeMarks): FreeMarks {
  const out: Record<string, number[]> = {}
  for (const [date, cells] of Object.entries(calendar)) {
    const kept = new Set(marks[date] ?? [])
    const left = cells.filter(cell => kept.has(cell))
    if (left.length) out[date] = left
  }
  return out
}

export type BusySaveResult = {
  /** What the bar should show now: the newest change asked for, minus any change the server refused. */
  marks: FreeMarks
  /** The steps among `marks` that came from Google Calendar. */
  calendar: FreeMarks
  error: string | null
  /** True when a newer change was asked for after this one; only the newest result settles the bar. */
  stale: boolean
}

export function createAccountBusyController(store: PersonalStorePort) {
  let rows: BusyRange[] = []
  let queue: Promise<unknown> = Promise.resolve()
  // The bar's newest marks. Every queued save syncs the server to this, not to the marks it was
  // called with, so a slow older save can never put back a stretch a newer drag took away.
  let wanted: FreeMarks = {}
  let sequence = 0
  return {
    async load(): Promise<{ marks: FreeMarks; calendar: FreeMarks; error: string | null }> {
      try { rows = await store.listBusy(); wanted = rangesToMarks(rows); return { marks: wanted, calendar: calendarMarksOf(rows), error: null } }
      catch (error) { return { marks: rangesToMarks(rows), calendar: calendarMarksOf(rows), error: problem(error, 'Your busy time could not be loaded.') } }
    },
    /** Saves run one after another. A refused save takes back only its own change. */
    save(marks: FreeMarks): Promise<BusySaveResult> {
      const id = ++sequence
      const before = wanted
      wanted = marks
      const run = queue.then(async (): Promise<BusySaveResult> => {
        const target = wanted
        const plan = planBusySync(rows, target)
        try {
          for (const row of plan.remove) {
            try { await store.removeBusy(row.id) }
            catch (error) { if (!(error instanceof PersonalStoreError && error.kind === 'not-found')) throw error }
            rows = rows.filter(item => item.id !== row.id)
          }
          for (const draft of plan.add) rows = [...rows, await store.addBusy(draft)]
          return { marks: wanted, calendar: calendarWithin(calendarMarksOf(rows), wanted), error: null, stale: id !== sequence }
        } catch (error) {
          // Only this change is taken back. The next save syncs the server to the bar again.
          wanted = undoChange(wanted, before, marks)
          return { marks: wanted, calendar: calendarWithin(calendarMarksOf(rows), wanted), error: problem(error, 'Your busy time was not saved. Try again.'), stale: id !== sequence }
        }
      })
      queue = run
      return run
    },
  }
}
