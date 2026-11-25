// MODEL: a signed-in student's own saved things (profile name, My Schedule plan IDs,
// Someday ideas and busy time) and the port every storage adapter implements.
// The rules here mirror supabase/migrations/20261124000000_accounts_personal_tables.sql,
// so the server rejects a bad request before the database has to.
// No React, View or Controller imports.
import { MAX_PLANNED_EVENTS } from './schedule'
import { MAX_IDEA_NOTE, MAX_IDEA_TITLE, MAX_INTENTIONS, type Intention, type IntentionStatus } from './someday'

export const MAX_DISPLAY_NAME = 60
export const MAX_PLANS = MAX_PLANNED_EVENTS
export const MAX_IDEAS = MAX_INTENTIONS
/** App-side cap on busy stretches from today on. The database has none, so the server counts. */
export const MAX_BUSY = 300
export const BUSY_SOURCES = ['typed', 'voice', 'calendar'] as const
export const IDEA_SOURCES = ['typed', 'voice'] as const
export const IDEA_STATUSES: readonly IntentionStatus[] = ['saved', 'ready', 'proposed', 'deferred', 'completed', 'rejected']

export type BusySource = typeof BUSY_SOURCES[number]
export type IdeaSource = typeof IDEA_SOURCES[number]
export type BusyDraft = { date: string; start: string; end: string; source: BusySource }
export type BusyRange = BusyDraft & { id: string }
export type IdeaDraft = { title: string; note: string; source: IdeaSource }
export type IdeaPatch = { title?: string; note?: string; status?: IntentionStatus; eventId?: string | null }
export type Profile = { displayName: string }
export type PersonalSnapshot = { profile: Profile | null; plans: string[]; ideas: Intention[]; busy: BusyRange[] }

export type PersonalErrorKind = 'invalid' | 'limit' | 'not-found' | 'signed-out' | 'unavailable'
export class PersonalStoreError extends Error {
  constructor(readonly kind: PersonalErrorKind, message: string) { super(message) }
}

/** Every adapter (server HTTP client, Supabase, memory) offers the same operations. */
export interface PersonalStorePort {
  load(): Promise<PersonalSnapshot>
  listPlans(): Promise<string[]>
  listIdeas(): Promise<Intention[]>
  listBusy(): Promise<BusyRange[]>
  setProfile(displayName: string): Promise<Profile>
  addPlan(eventId: string): Promise<void>
  removePlan(eventId: string): Promise<void>
  addIdea(draft: IdeaDraft): Promise<Intention>
  updateIdea(id: string, patch: IdeaPatch): Promise<Intention>
  removeIdea(id: string): Promise<void>
  addBusy(draft: BusyDraft): Promise<BusyRange>
  removeBusy(id: string): Promise<void>
}

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/

const invalid = (message: string) => new PersonalStoreError('invalid', message)
const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid('Send an object.')
  return value as Record<string, unknown>
}
const onlyKeys = (data: Record<string, unknown>, allowed: readonly string[]) => {
  if (Object.keys(data).some(key => !allowed.includes(key))) throw invalid(`Only ${allowed.join(', ')} may be sent.`)
}

export function checkId(value: unknown, what = 'ID'): string {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) throw invalid(`That ${what} is not valid.`)
  return value.toLowerCase()
}

export function checkDisplayName(value: unknown): string {
  const data = record(value)
  onlyKeys(data, ['displayName'])
  const name = typeof data.displayName === 'string' ? data.displayName.trim() : ''
  if (!name || name.length > MAX_DISPLAY_NAME) throw invalid(`Use a name between 1 and ${MAX_DISPLAY_NAME} characters.`)
  return name
}

export function checkIdeaDraft(value: unknown): IdeaDraft {
  const data = record(value)
  onlyKeys(data, ['title', 'note', 'source'])
  const title = typeof data.title === 'string' ? data.title.trim() : ''
  const note = data.note === undefined ? '' : typeof data.note === 'string' ? data.note.trim() : null
  if (!title || title.length > MAX_IDEA_TITLE) throw invalid(`Enter an idea between 1 and ${MAX_IDEA_TITLE} characters.`)
  if (note === null || note.length > MAX_IDEA_NOTE) throw invalid(`Notes must be ${MAX_IDEA_NOTE} characters or fewer.`)
  const source = data.source === undefined ? 'typed' : data.source
  if (!IDEA_SOURCES.includes(source as IdeaSource)) throw invalid('Unknown idea source.')
  return { title, note, source: source as IdeaSource }
}

/** A patch alone cannot know the stored event, so the full ready-needs-event rule is checked again in the database. */
export function checkIdeaPatch(value: unknown): IdeaPatch {
  const data = record(value)
  onlyKeys(data, ['title', 'note', 'status', 'eventId'])
  const patch: IdeaPatch = {}
  if (data.title !== undefined) {
    const title = typeof data.title === 'string' ? data.title.trim() : ''
    if (!title || title.length > MAX_IDEA_TITLE) throw invalid(`Enter an idea between 1 and ${MAX_IDEA_TITLE} characters.`)
    patch.title = title
  }
  if (data.note !== undefined) {
    if (typeof data.note !== 'string' || data.note.trim().length > MAX_IDEA_NOTE) throw invalid(`Notes must be ${MAX_IDEA_NOTE} characters or fewer.`)
    patch.note = data.note.trim()
  }
  if (data.status !== undefined) {
    if (!IDEA_STATUSES.includes(data.status as IntentionStatus)) throw invalid('Unknown idea status.')
    patch.status = data.status as IntentionStatus
  }
  if (data.eventId !== undefined) patch.eventId = data.eventId === null ? null : checkId(data.eventId, 'event')
  if (!Object.keys(patch).length) throw invalid('Nothing to change.')
  if ((patch.status === 'ready' || patch.status === 'proposed') && patch.eventId === null) {
    throw invalid('Choose a real event before marking this idea ready.')
  }
  return patch
}

const minutes = (time: string) => { const [h, m] = time.split(':').map(Number); return h * 60 + m }
export const shortTime = (time: string) => time.slice(0, 5)

export function checkBusyDraft(value: unknown): BusyDraft {
  const data = record(value)
  onlyKeys(data, ['date', 'start', 'end', 'source'])
  const { date, start, end } = data
  if (typeof date !== 'string' || !DATE_PATTERN.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) throw invalid('Use a date like 2026-11-24.')
  if (typeof start !== 'string' || typeof end !== 'string' || !TIME_PATTERN.test(start) || !TIME_PATTERN.test(end)) throw invalid('Use times like 09:30.')
  if (minutes(start) >= minutes(end)) throw invalid('Busy time must end after it starts, on the same day.')
  const source = data.source === undefined ? 'typed' : data.source
  if (!BUSY_SOURCES.includes(source as BusySource)) throw invalid('Unknown busy-time source.')
  return { date, start: shortTime(start), end: shortTime(end), source: source as BusySource }
}

/**
 * Memory adapter: one shared table set with the database's owner rules applied by user,
 * so tests can prove one student never sees or changes another's rows. `forUser` returns
 * the port as that user would see it, the way a forwarded token does on the server.
 */
export function createMemoryPersonalTables(newId: () => string = () => crypto.randomUUID()) {
  const profiles = new Map<string, Profile>()
  const plans: { userId: string; eventId: string }[] = []
  const ideas: (Intention & { userId: string })[] = []
  const busy: (BusyRange & { userId: string })[] = []
  const strip = <T extends { userId: string }>({ userId: _owner, ...rest }: T) => rest
  function forUser(userId: string): PersonalStorePort {
    const port: PersonalStorePort = {
      async load() { return { profile: profiles.get(userId) ?? null, plans: await port.listPlans(), ideas: await port.listIdeas(), busy: await port.listBusy() } },
      async listPlans() { return plans.filter(row => row.userId === userId).map(row => row.eventId) },
      async listIdeas() { return ideas.filter(row => row.userId === userId).map(row => strip(row)) },
      async listBusy() { return busy.filter(row => row.userId === userId).map(row => strip(row)) },
      async setProfile(displayName) { const profile = { displayName }; profiles.set(userId, profile); return profile },
      async addPlan(eventId) {
        if (plans.some(row => row.userId === userId && row.eventId === eventId)) return
        if (plans.filter(row => row.userId === userId).length >= MAX_PLANS) throw new PersonalStoreError('limit', `Your schedule has reached the ${MAX_PLANS}-event limit.`)
        plans.push({ userId, eventId })
      },
      async removePlan(eventId) {
        const at = plans.findIndex(row => row.userId === userId && row.eventId === eventId)
        if (at >= 0) plans.splice(at, 1)
      },
      async addIdea(draft) {
        if (ideas.filter(row => row.userId === userId).length >= MAX_IDEAS) throw new PersonalStoreError('limit', `Your Someday list has reached its ${MAX_IDEAS}-idea limit.`)
        const idea: Intention = { id: newId(), title: draft.title, note: draft.note, status: 'saved', eventId: null }
        ideas.unshift({ ...idea, userId })
        return idea
      },
      async updateIdea(id, patch) {
        const row = ideas.find(item => item.userId === userId && item.id === id)
        if (!row) throw new PersonalStoreError('not-found', 'Idea not found.')
        const next = { ...row, ...patch }
        if ((next.status === 'ready' || next.status === 'proposed') && !next.eventId) throw invalid('Choose a real event before marking this idea ready.')
        Object.assign(row, next)
        return strip(row)
      },
      async removeIdea(id) {
        const at = ideas.findIndex(row => row.userId === userId && row.id === id)
        if (at < 0) throw new PersonalStoreError('not-found', 'Idea not found.')
        ideas.splice(at, 1)
      },
      async addBusy(draft) {
        if (busy.filter(row => row.userId === userId).length >= MAX_BUSY) throw new PersonalStoreError('limit', 'You have too much busy time saved. Clear some first.')
        const row = { ...draft, id: newId() }
        busy.push({ ...row, userId })
        return row
      },
      async removeBusy(id) {
        const at = busy.findIndex(row => row.userId === userId && row.id === id)
        if (at < 0) throw new PersonalStoreError('not-found', 'That busy time is gone already.')
        busy.splice(at, 1)
      },
    }
    return port
  }
  return { forUser }
}
