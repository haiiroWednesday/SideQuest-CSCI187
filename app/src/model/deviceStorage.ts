// MODEL: where this device keeps plans, ideas and posts. Normally the browser's localStorage.
// Some browsers block it (private modes, strict privacy settings): reading `window.localStorage`
// then throws. SideQuest must still work, so everything falls back to one in-memory store that
// lasts for this visit, and the page says once that nothing will be kept.

export type DeviceStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const memory = new Map<string, string>()
/** The visit-only store used when the browser refuses storage. */
export const memoryStorage: DeviceStorage = {
  getItem: key => memory.get(key) ?? null,
  setItem: (key, value) => { memory.set(key, String(value)) },
  removeItem: key => { memory.delete(key) },
}

const PROBE = 'sidequest.storage-probe'
/** True when the browser lets this page read and write its storage. */
export function storageWorks(): boolean {
  try {
    const storage = window.localStorage
    storage.setItem(PROBE, '1')
    storage.removeItem(PROBE)
    return true
  } catch { return false }
}

/** localStorage when the browser allows it, otherwise the visit-only memory store. Asked each time,
 *  so a store that starts working (or stops) is noticed. A full disk still fails a write, as before. */
export function deviceStorage(): DeviceStorage {
  try {
    const storage = window.localStorage
    storage.getItem(PROBE)
    return storage
  } catch { return memoryStorage }
}
