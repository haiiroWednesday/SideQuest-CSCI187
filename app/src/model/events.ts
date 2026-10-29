// MODEL: Event data, time rules, and storage. No built-in fictional events.
export type CampusEvent = {
  id: string
  title: string
  description?: string // optional for compatibility with events already saved in M1
  location: string
  date: string // YYYY-MM-DD, local calendar date
  start: string // HH:MM, same day
  end: string
}

export type EventDraft = Omit<CampusEvent, 'id'>

export const STORAGE_KEY = 'sidequest.created-events.v1'

// Event dates are calendar dates, so compare them in the user's local timezone,
// never against toISOString() (which uses UTC and can shift the date).
export function todayLocalISO(now: Date = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Store dates/times in predictable machine-readable formats; format only for display.
export function formatEventDate(date: string): string {
  if (!isValidDate(date)) return date
  const [year, month, day] = date.split('-').map(Number)
  return `${month}/${day}/${year}`
}

export function formatEventTime(time: string): string {
  const minutes = toMinutes(time)
  if (minutes === null) return time
  const hour = Math.floor(minutes / 60)
  const minute = String(minutes % 60).padStart(2, '0')
  return `${hour % 12 || 12}:${minute}${hour < 12 ? 'am' : 'pm'}`
}

export function toMinutes(time: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

export function isValidDate(date: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (year < 100 || month < 1 || month > 12 || day < 1 || day > 31) return false
  const parsed = new Date(Date.UTC(year, month - 1, day))
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() + 1 === month && parsed.getUTCDate() === day
}

export function fitsFully(event: CampusEvent, freeDate: string, freeStart: string, freeEnd: string): boolean {
  const start = toMinutes(freeStart)
  const end = toMinutes(freeEnd)
  const eventStart = toMinutes(event.start)
  const eventEnd = toMinutes(event.end)
  if (!isValidDate(freeDate) || !isValidDate(event.date) || event.date !== freeDate) return false
  if (start === null || end === null || eventStart === null || eventEnd === null) return false
  return start < end && eventStart < eventEnd && start <= eventStart && eventEnd <= end
}

export function isCampusEvent(value: unknown): value is CampusEvent {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Partial<CampusEvent>
  return typeof item.id === 'string' && item.id.length > 0 &&
    typeof item.title === 'string' && item.title.trim().length > 0 &&
    (item.description === undefined || (typeof item.description === 'string' && item.description.length <= 500)) &&
    typeof item.location === 'string' && item.location.trim().length > 0 &&
    typeof item.date === 'string' && isValidDate(item.date) &&
    typeof item.start === 'string' && typeof item.end === 'string' &&
    toMinutes(item.start) !== null && toMinutes(item.end) !== null &&
    (toMinutes(item.start) as number) < (toMinutes(item.end) as number)
}

// localStorage is a browser-only prototype store; other computers do NOT share its events.
export function readStoredEvents(storage: Pick<Storage, 'getItem'>): CampusEvent[] {
  try {
    const saved = storage.getItem(STORAGE_KEY)
    if (!saved) return []
    const parsed: unknown = JSON.parse(saved)
    return Array.isArray(parsed) ? parsed.filter(isCampusEvent) : []
  } catch {
    return [] // e.g., blocked storage or corrupt JSON
  }
}

export function saveStoredEvents(storage: Pick<Storage, 'setItem'>, events: CampusEvent[]): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(events))
    return true
  } catch {
    return false
  }
}
