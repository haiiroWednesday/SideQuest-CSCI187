// CONTROLLER: an unfinished post survives switching tabs. It is kept in memory
// for the open app only (one draft per catalog connection) and is never written
// to storage, so a closed tab or a fresh test starts empty.
import type { EventDraft } from './postEvent'

const drafts = new WeakMap<object, EventDraft>()
const hasWriting = (draft: Partial<EventDraft>) => Boolean(draft.title?.trim() || draft.description?.trim() || draft.location?.trim())

export function readPostDraft(owner: object): EventDraft | null {
  return drafts.get(owner) ?? null
}

export function keepPostDraft(owner: object, draft: EventDraft): void {
  if (hasWriting(draft)) drafts.set(owner, { ...draft })
  else drafts.delete(owner)
}
