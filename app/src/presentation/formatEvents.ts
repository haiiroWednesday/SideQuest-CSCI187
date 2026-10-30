// PRESENTATION: human-readable date and time labels, separate from domain data.
import { isValidDate, toMinutes } from '../model/events'

// 📅 The Model stores dates as YYYY-MM-DD for reliable comparisons.
// This helper changes only the visible label to M/D/YYYY.
export function formatEventDate(date: string): string {
  // Keep unexpected inputs unchanged rather than producing "NaN/NaN/...".
  if (!isValidDate(date)) return date
  // Split "2026-10-27" into pieces, then turn those text pieces into
  // numbers. Number("10") is 10, so the label needs no leading zero.
  const [year, month, day] = date.split('-').map(Number)
  return `${month}/${day}/${year}`
}

// 🕛 % 12 converts 24-hour times to 12-hour times; || 12 turns the
// otherwise-zero hour into 12 for midnight or noon.
export function formatEventTime(time: string): string {
  const minutes = toMinutes(time)
  if (minutes === null) return time
  const hour = Math.floor(minutes / 60)
  // The remainder (%) gives the minutes within the hour, and padStart
  // makes "5" display as "05" in labels such as "9:05am".
  const minute = String(minutes % 60).padStart(2, '0')
  return `${hour % 12 || 12}:${minute}${hour < 12 ? 'am' : 'pm'}`
}

