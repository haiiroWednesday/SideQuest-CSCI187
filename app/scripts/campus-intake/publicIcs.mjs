// Calendar UIDs identify source evidence. They are not Google API instance IDs.
import ICAL from 'ical.js'
import { registeredCalendarUrl } from './googlePublicCalendar.mjs'
import { readPublic } from './independentSources.mjs'
import { normalizeOrganizerExport } from './organizerExport.mjs'

const SERIES_FIELDS = ['rrule', 'rdate', 'exdate', 'exrule', 'recurrence-id']
const SINGLE_FIELDS = ['uid', 'class', 'status', 'dtstart', 'dtend', 'summary', 'location']

function explicitUtc(component, name) {
  const property = component.getFirstProperty(name)
  if (!property || property.type !== 'date-time' || property.getParameter('tzid')) return null
  const value = property.toJSON()[3]
  // Floating times, local time zones and date-only records require separate review.
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(value)) return null
  const ms = Date.parse(value)
  return Number.isFinite(ms) && new Date(ms).toISOString() === value.replace('Z', '.000Z') ? value : null
}

export async function collectPublicIcs(source, { approvedRead = false, now = new Date(), fetchImpl = fetch } = {}) {
  if (!approvedRead) throw new Error('Public calendar approval required')
  const sourceUrl = registeredCalendarUrl(source)
  const feedUrl = 'https://calendar.google.com/calendar/ical/' + encodeURIComponent(source.calendarId) + '/public/basic.ics'
  const body = await readPublic(feedUrl, 'text/calendar', fetchImpl)
  if (!body.trimEnd().endsWith('END:VCALENDAR')) throw new Error('Incomplete public calendar')
  const calendar = new ICAL.Component(ICAL.parse(body))
  const method = calendar.getFirstPropertyValue('method')
  if (calendar.name !== 'vcalendar' || calendar.getFirstPropertyValue('version') !== '2.0' ||
      (method && method !== 'PUBLISH')) throw new Error('Unexpected public calendar format')
  const entries = calendar.getAllSubcomponents('vevent')
  if (entries.length > 1000) throw new Error('Calendar record cap reached')

  const seen = new Set(), ambiguous = new Set()
  for (const entry of entries) {
    for (const prop of entry.getAllProperties('uid')) {
      const uid = prop.getFirstValue()
      if (seen.has(uid) || SERIES_FIELDS.some(field => entry.hasProperty(field))) ambiguous.add(uid)
      seen.add(uid)
    }
  }
  const events = []
  const omitted = { seriesOrRepeatedUid: 0, unverifiedStart: 0, outsideWindow: 0, other: 0 }
  for (const entry of entries) {
    const uid = entry.getFirstPropertyValue('uid')
    if (ambiguous.has(uid)) { omitted.seriesOrRepeatedUid++; continue }
    if (typeof uid !== 'string' || !/^[A-Za-z0-9._:@-]{1,160}$/.test(uid) ||
        SINGLE_FIELDS.some(field => entry.getAllProperties(field).length > 1) ||
        ![null,'PUBLIC'].includes(entry.getFirstPropertyValue('class')) ||
        entry.getFirstPropertyValue('status') !== 'CONFIRMED') { omitted.other++; continue }
    const start = explicitUtc(entry, 'dtstart')
    if (!start) { omitted.unverifiedStart++; continue }
    if (Date.parse(start) <= now.getTime() || Date.parse(start) >= now.getTime() + 45 * 86400000) {
      omitted.outsideWindow++; continue
    }
    events.push({ occurrenceId:uid, title:entry.getFirstPropertyValue('summary'), location:entry.getFirstPropertyValue('location'),
      sourceUrl, startsAt:start, endsAt:explicitUtc(entry,'dtend'), status:'scheduled' })
  }
  const snapshot = normalizeOrganizerExport({ version:1, provider:source.id, events }, { ...source, page:sourceUrl }, { approvedExport:true, now })
  return { ...snapshot, transport:'public-ics', received:entries.length, omitted, feedUrl,
    records:snapshot.records.map(row => ({ ...row, occurrenceKey:source.id + ':ical:' + row.providerId,
      sourceUrl, reviewState:'held', reasons:[...row.reasons,'attendance-and-host-review','source-identity-review'] })) }
}
