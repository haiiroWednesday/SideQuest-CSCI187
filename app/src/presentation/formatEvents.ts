// PRESENTATION: human-readable date and time labels, separate from domain data.
import { isValidDate, toMinutes } from '../model/events'

// Store dates/times in predictable machine-readable formats; format only for display.
// Display M/D/YYYY for people, while leaving the original YYYY-MM-DD
// string unchanged for saving and date comparisons.
export function formatEventDate(date: string): string {
  if (!isValidDate(date)) return date
  const [year, month, day] = date.split('-').map(Number)
  return `${month}/${day}/${year}`
}

// % 12 converts a 24-hour value to a 12-hour clock. The || 12 case
// displays hour 0 (midnight) and hour 12 (noon) as hour 12.
export function formatEventTime(time: string): string {
  const minutes = toMinutes(time)
  if (minutes === null) return time
  const hour = Math.floor(minutes / 60)
  const minute = String(minutes % 60).padStart(2, '0')
  return `${hour % 12 || 12}:${minute}${hour < 12 ? 'am' : 'pm'}`
}

