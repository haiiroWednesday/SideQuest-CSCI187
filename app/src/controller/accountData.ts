// CONTROLLER: My Schedule, Someday and busy time for a signed-in student.
// The rules (limits, overlap warnings, idea statuses, free-time cells) are the same ones the
// device-only app uses. Only where things are kept changes: the PersonalStorePort, which in the
// app is the /api/me server adapter. A change shows once the server has saved it, or is undone
// with a message when it was refused.
import { createSharedScheduleController, type SharedScheduleResult } from './sharedSchedule'
import { CELL, CELLS, DAY_START, type FreeMarks } from './freeMarks'
import type { SomedayResult } from './someday'
import type { EventCatalogPort } from '../model/eventCatalog'
import { PLANNED_IDS_KEY, type PlanStorage } from '../model/schedule'
import { addIntention, linkIntention, setIntentionStatus, type Intention, type IntentionStatus } from '../model/someday'
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

  function update(id: string, check: (list: readonly Intention[]) => { items: Intention[]; error: string | null }, send: () => Promise<Intention>): AccountSomedayStep {
    if (isPending(id)) return { now: refused('Still saving this idea. Try again in a moment.'), saved: null }
    const next = check(items)
    if (next.error) return { now: refused(next.error), saved: null }
    const previous = items
    items = next.items
    const saved = send()
      .then(row => { items = items.map(item => item.id === row.id ? row : item); return ok() })
      .catch(error => { items = previous; return refused(problem(error, 'Your change was not saved. Try again.')) })
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
        .then(row => { items = items.map(item => item.id === temp ? row : item); savedDuringLoad?.add(row.id); return ok() })
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

const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
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

export function createAccountBusyController(store: PersonalStorePort) {
  let rows: BusyRange[] = []
  let queue: Promise<unknown> = Promise.resolve()
  return {
    async load(): Promise<{ marks: FreeMarks; error: string | null }> {
      try { rows = await store.listBusy(); return { marks: rangesToMarks(rows), error: null } }
      catch (error) { return { marks: rangesToMarks(rows), error: problem(error, 'Your busy time could not be loaded.') } }
    },
    /** Saves run one after another, each against the rows the last one left. */
    save(marks: FreeMarks): Promise<{ marks: FreeMarks; error: string | null }> {
      const run = queue.then(async () => {
        const plan = planBusySync(rows, marks)
        try {
          for (const row of plan.remove) {
            try { await store.removeBusy(row.id) }
            catch (error) { if (!(error instanceof PersonalStoreError && error.kind === 'not-found')) throw error }
            rows = rows.filter(item => item.id !== row.id)
          }
          for (const draft of plan.add) rows = [...rows, await store.addBusy(draft)]
          return { marks, error: null }
        } catch (error) {
          return { marks: rangesToMarks(rows), error: problem(error, 'Your busy time was not saved. Try again.') }
        }
      })
      queue = run
      return run
    },
  }
}
