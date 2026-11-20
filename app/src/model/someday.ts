// MODEL: unfinished activity ideas, distinct from dated Events and scheduled plans.
// Persistence is device-local until a reviewed account/permission model exists.
export const SOMEDAY_KEY = 'sidequest.someday-intentions.v1'
export const MAX_INTENTIONS = 100
export const MAX_IDEA_TITLE = 120
export const MAX_IDEA_NOTE = 500

export type IntentionStatus = 'saved' | 'ready' | 'proposed' | 'deferred' | 'completed' | 'rejected'

export type Intention = {
  id: string
  title: string
  note: string
  status: IntentionStatus
  eventId: string | null
}

export type SomedayStorage = Pick<Storage, 'getItem' | 'setItem'>
export type SomedayRead = { items: Intention[]; blocked: boolean }
export type SomedayChange = { items: Intention[]; error: string | null }

const statuses: readonly IntentionStatus[] = ['saved', 'ready', 'proposed', 'deferred', 'completed', 'rejected']

export function isIntention(value: unknown): value is Intention {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<Intention>
  return typeof item.id === 'string' && item.id.trim().length > 0 &&
    typeof item.title === 'string' && item.title.trim().length > 0 && item.title.length <= MAX_IDEA_TITLE &&
    typeof item.note === 'string' && item.note.length <= MAX_IDEA_NOTE &&
    statuses.includes(item.status as IntentionStatus) &&
    (item.eventId === null || (typeof item.eventId === 'string' && item.eventId.trim().length > 0)) &&
    (!['ready', 'proposed'].includes(item.status as string) || item.eventId !== null)
}

export function readSomeday(storage: Pick<SomedayStorage, 'getItem'>): SomedayRead {
  try {
    const text = storage.getItem(SOMEDAY_KEY)
    if (text === null) return { items: [], blocked: false }
    const parsed: unknown = JSON.parse(text)
    if (!Array.isArray(parsed) || parsed.length > MAX_INTENTIONS ||
      !parsed.every(isIntention)) return { items: [], blocked: true }
    const ids = new Set(parsed.map(item => item.id))
    if (ids.size !== parsed.length) return { items: [], blocked: true }
    return { items: parsed, blocked: false }
  } catch {
    // Preserve unreadable raw storage until the student explicitly recovers it.
    return { items: [], blocked: true }
  }
}

export function saveSomeday(storage: Pick<SomedayStorage, 'setItem'>, items: readonly Intention[]): boolean {
  try {
    storage.setItem(SOMEDAY_KEY, JSON.stringify(items))
    return true
  } catch {
    return false
  }
}

export function addIntention(items: readonly Intention[], title: string, note: string, id: string): SomedayChange {
  const cleanTitle = title.trim()
  const cleanNote = note.trim()
  if (!cleanTitle || cleanTitle.length > MAX_IDEA_TITLE) {
    return { items: [...items], error: 'Enter an idea between 1 and 120 characters.' }
  }
  if (cleanNote.length > MAX_IDEA_NOTE) {
    return { items: [...items], error: 'Notes must be 500 characters or fewer.' }
  }
  if (!id.trim() || items.some(item => item.id === id)) {
    return { items: [...items], error: 'Could not create a unique idea.' }
  }
  if (items.length >= MAX_INTENTIONS) {
    return { items: [...items], error: 'Your Someday list has reached its 100-idea limit.' }
  }
  return {
    items: [{ id, title: cleanTitle, note: cleanNote, status: 'saved', eventId: null }, ...items],
    error: null,
  }
}

export function linkIntention(items: readonly Intention[], id: string, eventId: string | null): SomedayChange {
  if (!items.some(item => item.id === id)) return { items: [...items], error: 'Idea not found.' }
  if (eventId !== null && !eventId.trim()) return { items: [...items], error: 'Select a valid event.' }
  return {
    items: items.map(item => item.id === id
      ? { ...item, eventId, status: eventId ? 'ready' as const : 'saved' as const }
      : item),
    error: null,
  }
}

export function setIntentionStatus(items: readonly Intention[], id: string, status: IntentionStatus): SomedayChange {
  const selected = items.find(item => item.id === id)
  if (!selected) return { items: [...items], error: 'Idea not found.' }
  if (['ready', 'proposed'].includes(status) && !selected.eventId) {
    return { items: [...items], error: 'Choose a real event before marking this idea ready.' }
  }
  return {
    items: items.map(item => item.id === id ? { ...item, status } : item),
    error: null,
  }
}
