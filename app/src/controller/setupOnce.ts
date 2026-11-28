// First-run setup is asked once (Nov 28). Any answer, Skip included, is remembered on this device.
const KEY = 'sidequest.setup.v1'

export function setupSeen(): boolean {
  try { return localStorage.getItem(KEY) === 'done' } catch { return true }
}
export function markSetupSeen(): void {
  try { localStorage.setItem(KEY, 'done') } catch { /* private mode: it will ask again next visit */ }
}
