// CONTROLLER: the words a toast says after a plan change, so every page names plans the same way.
// Each toast that reports a change also offers Undo; this file only writes the sentence.
import { storageWorks } from '../model/deviceStorage'

/** “Choir”, “Choir” and “Climbing”, or “Choir”, “Climbing” and “Film night”. */
export function namedList(titles: readonly string[]): string {
  const quoted = titles.map(title => `“${title}”`)
  return quoted.length <= 1 ? quoted.join('') : `${quoted.slice(0, -1).join(', ')} and ${quoted[quoted.length - 1]}`
}
/** "Removed “Choir” from My Schedule." Names every plan removed. */
export function removedText(titles: readonly string[]): string {
  return titles.length ? `Removed ${namedList(titles)} from My Schedule.` : 'Removed from My Schedule.'
}
/** "Plan all": "2 plans added." One plan reads like Plan it does. */
export function addedText(count: number, title?: string): string {
  if (count === 1) return title ? `Added “${title}” to My Schedule.` : 'Added to My Schedule.'
  return `${count} plans added.`
}
export const BUSY_CLEARED_TEXT = 'Busy time cleared.'
export const NO_STORAGE_TEXT = "This browser won't save your plans."

/** The one line a page shows when this browser blocks storage and nothing is kept in an account. */
export function storageNotice(savedToAccount: boolean): string | null {
  return savedToAccount || storageWorks() ? null : NO_STORAGE_TEXT
}
