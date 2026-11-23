// MODEL: explicit, bounded campus-local weekend interpretation for public-event search.
// Do not guess what "the weekend" alone means or silently shift ambiguous dates.
// The caller must show the resolved dates to the student.
import { isValidDate } from './events'

export type WeekendDateRange = { from: string; through: string }

function atUtcNoon(date: string): Date {
  return new Date(date + 'T12:00:00.000Z')
}
function shifted(date: Date, days: number): string {
  const result = new Date(date)
  result.setUTCDate(result.getUTCDate() + days)
  return result.toISOString().slice(0, 10)
}

export function recognizeWeekendRange(query: string, californiaToday: string): WeekendDateRange | null {
  if (!isValidDate(californiaToday)) return null
  const match = /\b(this|next)\s+weekend\b/i.exec(query)
  if (!match) return null

  // "This" refers to the current Sat/Sun if today is already the weekend,
  // otherwise the next approaching Sat/Sun. "Next" refers to the one after.
  const today = atUtcNoon(californiaToday)
  const day = today.getUTCDay()
  const untilSaturday = day === 0 ? -1 : (6 - day + 7) % 7
  const offset = untilSaturday + (match[1].toLowerCase() === 'next' ? 7 : 0)
  return { from: shifted(today, offset), through: shifted(today, offset + 1) }
}
