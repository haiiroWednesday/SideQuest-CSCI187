// CONTROLLER: remembers which events this browser posted, so the map can mark them as yours.
export const POSTED_IDS_KEY = 'sidequest.posted-ids.v1'

function store(): Storage | null { try { return typeof localStorage === 'undefined' ? null : localStorage } catch { return null } }

export function readPostedIds(storage: Pick<Storage, 'getItem'> | null = store()): string[] {
  try {
    const v: unknown = JSON.parse(storage?.getItem(POSTED_IDS_KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch { return [] }
}

export function addPostedId(id: string, storage: Pick<Storage, 'getItem' | 'setItem'> | null = store()): string[] {
  const next = [...new Set([...readPostedIds(storage), id])]
  try { storage?.setItem(POSTED_IDS_KEY, JSON.stringify(next)) } catch { /* still marked for this visit */ }
  return next
}
