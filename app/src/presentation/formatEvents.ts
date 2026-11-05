// PRESENTATION: human-readable date and time labels, separate from domain data.
import { isValidDate, toMinutes } from '../model/events'

// Convert stored YYYY-MM-DD dates into display labels without altering domain data.
export function formatEventDate(date: string): string {
  // Keep unexpected inputs unchanged rather than producing "NaN/NaN/...".
  if (!isValidDate(date)) return date
  const [year, month, day] = date.split('-').map(Number)
  return `${month}/${day}/${year}`
}

// Display campus wall-clock times using 12-hour labels, preserving invalid input.
export function formatEventTime(time: string): string {
  const minutes = toMinutes(time)
  if (minutes === null) return time
  const hour = Math.floor(minutes / 60)
  const minute = String(minutes % 60).padStart(2, '0')
  return `${hour % 12 || 12}:${minute}${hour < 12 ? 'am' : 'pm'}`
}

