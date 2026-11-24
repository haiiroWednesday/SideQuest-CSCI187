// VIEW: the design review shows fewer words. Views read this to pick their short form.
import { createContext, useContext } from 'react'
export const QuietContext = createContext(false)
export const useQuiet = () => useContext(QuietContext)

/** Quiet day heading: the leaf beside it already shows the date. */
export function shortDay(tag: string, long: string): string {
  if (tag === 'TODAY') return 'Today'
  if (tag === 'TOMORROW') return 'Tomorrow'
  return long.split(',')[0]
}
