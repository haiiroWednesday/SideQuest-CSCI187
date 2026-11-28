// Public organizer calendars only. No account OAuth or access to private calendars.
// Google expands recurring events and exceptions; SideQuest never expands a guessed schedule.
import { normalizeOrganizerExport } from './organizerExport.mjs'

const ORIGIN = 'https://www.googleapis.com'
const MAX_PAGES = 10
const MAX_BYTES = 2_000_000
const MAX_ROWS = 1000
const CALENDAR_ID = /^[A-Za-z0-9._-]{1,180}@(?:group|resource)\.calendar\.google\.com$/
const EVENT_ID = /^[A-Za-z0-9_-]{1,160}$/
const OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/

async function readJson(response) {
  if (!response.ok || !response.body || !(response.headers.get('content-type') ?? '').includes('json') ||
      Number(response.headers.get('content-length')) > MAX_BYTES) {
    await response.body?.cancel().catch(()=>{})
    throw new Error('Google calendar response unavailable or invalid')
  }
  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8',{fatal:true})
  let size = 0, text = ''
  try {
    for (;;) {
      const {done,value} = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_BYTES) throw new Error('Google calendar page exceeds limit')
      text += decoder.decode(value,{stream:true})
    }
    return JSON.parse(text + decoder.decode())
  } finally {
    await reader.cancel().catch(()=>{})
    reader.releaseLock()
  }
}

function eventUrl(source) {
  // This is a verified source calendar link, not an invented per-event URL.
  const url = new URL(source.calendarUrl)
  if (url.origin !== 'https://calendar.google.com' || url.pathname !== '/calendar/embed' ||
      url.searchParams.get('src') !== source.calendarId || url.username || url.password) throw new Error('Invalid registered calendar link')
  return url.href
}

export async function collectPublicGoogleCalendar(source, {
  approvedRead = false, apiKey, now = new Date(), horizonDays = 45, fetchImpl = globalThis.fetch,
} = {}) {
  if (!approvedRead) throw new Error('Public calendar approval required')
  if (!source || source.adapter !== 'google-public-calendar' || !CALENDAR_ID.test(source.calendarId ?? '')) throw new Error('Unknown public calendar')
  if (typeof apiKey !== 'string' || !apiKey.trim()) throw new Error('Server-side public calendar API key required')
  if (!Number.isInteger(horizonDays) || horizonDays < 1 || horizonDays > 90) throw new Error('Invalid horizon')
  const sourceUrl = eventUrl(source)
  const end = new Date(now.getTime() + horizonDays * 86400000)
  const url = new URL(ORIGIN + '/calendar/v3/calendars/' + encodeURIComponent(source.calendarId) + '/events')
  url.search = new URLSearchParams({
    singleEvents:'true',showDeleted:'true',timeMin:now.toISOString(),timeMax:end.toISOString(),maxResults:'250',
    fields:'accessRole,nextPageToken,items(id,status,summary,start(date,dateTime),end(date,dateTime),endTimeUnspecified,location,visibility,eventType,recurringEventId,originalStartTime(date,dateTime))',
  }).toString()
  const rows = [], cancellations = new Set(), seenPages = new Set(), seenIds = new Set()
  let pages = 0, received = 0, excludedMissingStart = 0, excludedOther = 0
  for (;;) {
    if (++pages > MAX_PAGES) throw new Error('Calendar page limit reached')
    const response = await fetchImpl(url.href,{redirect:'error',signal:AbortSignal.timeout(12000),
      headers:{Accept:'application/json','X-Goog-Api-Key':apiKey}})
    const payload = await readJson(response)
    // An API key alone does not authorize private calendars; reject free/busy-only results.
    if (!['reader','writer','owner'].includes(payload?.accessRole) || !Array.isArray(payload.items)) throw new Error('Calendar does not expose readable event details')
    for (const item of payload.items) {
      if (++received > MAX_ROWS) throw new Error('Calendar record cap reached')
      if (!item || typeof item.id !== 'string' || !EVENT_ID.test(item.id) || seenIds.has(item.id)) throw new Error('Invalid or repeated calendar event ID')
      seenIds.add(item.id)
      // Cancellations may contain only an ID. Keep them separately from attendable candidates.
      if (item.status === 'cancelled') { cancellations.add(item.id); continue }
      if (item.visibility === 'private' || item.visibility === 'confidential' ||
          item.eventType && item.eventType !== 'default' || item.status !== 'confirmed') { excludedOther++; continue }
      const start = item.start?.dateTime
      if (typeof start !== 'string' || !OFFSET.test(start) || !Number.isFinite(Date.parse(start))) { excludedMissingStart++; continue }
      if (Date.parse(start) <= now.getTime() || Date.parse(start) >= end.getTime()) { excludedOther++; continue }
      rows.push({occurrenceId:item.id,title:item.summary,organizer:source.name,location:item.location,
        sourceUrl,startsAt:start,endsAt:item.endTimeUnspecified ? null : item.end?.dateTime ?? null,
        status:'scheduled',audience:'scu-students'})
    }
    const next = payload.nextPageToken
    if (next === undefined || next === null || next === '') break
    if (typeof next !== 'string' || next.length > 2048 || seenPages.has(next)) throw new Error('Invalid calendar pagination token')
    seenPages.add(next)
    url.searchParams.set('pageToken',next)
  }
  const snapshot = normalizeOrganizerExport({version:1,provider:source.id,events:rows},
    {...source,page:sourceUrl},{approvedExport:true,now})
  // The calendar owner must still confirm actual attendance eligibility and host identity.
  return {...snapshot,complete:true,pages,received,excludedMissingStart,excludedOther,
    cancellations:[...cancellations],records:snapshot.records.filter(row=>row.start !== null).map(row=>({
      ...row,sourceUrl,reviewState:'held',reasons:[...row.reasons,'attendance-and-host-review'],
    }))}
}
