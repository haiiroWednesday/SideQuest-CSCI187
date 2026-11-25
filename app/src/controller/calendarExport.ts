// CONTROLLER: create a Google Calendar draft link without OAuth or calendar access.
// Dates in EventCatalog are Santa Clara wall-clock times, not the browser's timezone.
import { isValidDate, toMinutes } from '../model/events'
import type { CampusEvent } from '../model/eventCatalog'

export const CAMPUS_TIME_ZONE = 'America/Los_Angeles'
export type CalendarEvent = Pick<CampusEvent, 'id' | 'title' | 'description' | 'location' | 'date' | 'start' | 'end'>

// Building an Intl formatter is slow and this runs twice per Discover card, so make one and reuse it.
let campusClock: Intl.DateTimeFormat | null = null
function campusFormatter(): Intl.DateTimeFormat {
  campusClock ??= new Intl.DateTimeFormat('en-US', {
    timeZone: CAMPUS_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  })
  return campusClock
}

/** Resolve a local California clock time only if it maps to one unambiguous UTC instant. */
function calendarInstant(date: string, time: string): Date | null {
  if (!isValidDate(date) || toMinutes(time) === null) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) return null
  const [hours, minutes] = time.split(':').map(Number)
  const wallClockAsUTC = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), hours, minutes)
  const formatter = campusFormatter()
  // For modern SCU dates, Los Angeles uses UTC-7 or UTC-8.
  const matches = [7, 8].map(offset => new Date(wallClockAsUTC + offset * 60 * 60 * 1000))
    .filter(candidate => {
      const parts = formatter.formatToParts(candidate)
      const read = (type: string) => parts.find(part => part.type === type)?.value
      return read('year') === match[1] && read('month') === match[2] &&
        read('day') === match[3] &&
        Number(read('hour')) === hours && Number(read('minute')) === minutes
    })
  // DST spring gaps have 0 matches; autumn repeated clock times have 2.
  // Neither permits a trustworthy single Google Calendar draft.
  return matches.length === 1 ? matches[0] : null
}

function googleTimestamp(instant: Date): string {
  return instant.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

export function googleCalendarDraftUrl(event: CalendarEvent): string | null {
  const from = calendarInstant(event.date, event.start)
  const to = calendarInstant(event.date, event.end)
  if (!from || !to || to.getTime() <= from.getTime() || !event.title.trim()) return null

  const url = new URL('https://calendar.google.com/calendar/r/eventedit')
  url.searchParams.set('action', 'TEMPLATE')
  url.searchParams.set('dates', googleTimestamp(from) + '/' + googleTimestamp(to))
  url.searchParams.set('stz', CAMPUS_TIME_ZONE)
  url.searchParams.set('etz', CAMPUS_TIME_ZONE)
  url.searchParams.set('text', event.title)
  url.searchParams.set('details', event.description || 'Campus event from SideQuest')
  url.searchParams.set('location', event.location)
  return url.toString()
}
