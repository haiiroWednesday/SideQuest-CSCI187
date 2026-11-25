// CONTROLLER: persistent personal intentions with fail-closed browser storage.
import {
  SOMEDAY_KEY, addIntention, linkIntention, readSomeday, saveSomeday, setIntentionStatus,
  type Intention, type IntentionStatus, type SomedayChange, type SomedayStorage,
} from '../model/someday'
import { deviceStorage } from '../model/deviceStorage'

export type SomedayResult = { items: Intention[]; blocked: boolean; error: string | null }
export type { Intention, IntentionStatus } from '../model/someday'
export { SOMEDAY_KEY, MAX_IDEA_TITLE, MAX_IDEA_NOTE } from '../model/someday'

function browserStorage(): SomedayStorage {
  // Resolve storage lazily so browser permission errors are caught by the Model.
  return {
    getItem(key) { return deviceStorage().getItem(key) },
    setItem(key, value) { deviceStorage().setItem(key, value) },
  }
}

export function createSomedayController(
  storage: SomedayStorage = browserStorage(),
  newId: () => string = () => crypto.randomUUID(),
) {
  const read = (): SomedayResult => {
    const result = readSomeday(storage)
    return { ...result, error: result.blocked ? 'Saved ideas could not be read. No data was overwritten.' : null }
  }
  const change = (action: (items: readonly Intention[]) => SomedayChange): SomedayResult => {
    const previous = read()
    if (previous.blocked) return previous
    const next = action(previous.items)
    if (next.error) return { ...previous, error: next.error }
    if (!saveSomeday(storage, next.items)) {
      return { ...previous, error: 'Could not save this idea. Your previous list is unchanged.' }
    }
    return { items: next.items, blocked: false, error: null }
  }
  return {
    read,
    handlesStorageChange: (key: string | null) => key === null || key === SOMEDAY_KEY,
    add: (title: string, note: string) => change(items => addIntention(items, title, note, newId())),
    link: (id: string, eventId: string | null) => change(items => linkIntention(items, id, eventId)),
    setStatus: (id: string, status: IntentionStatus) => change(items => setIntentionStatus(items, id, status)),
    recover: (): SomedayResult => saveSomeday(storage, [])
      ? { items: [], blocked: false, error: null }
      : { ...read(), error: 'Could not reset unreadable ideas. The original stored data remains.' },
  }
}
