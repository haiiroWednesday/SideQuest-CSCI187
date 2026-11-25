// Offline comparison of browser-provided SCU JSON and ICS captures.
// Do not expand recurrence rules, copy descriptions, infer ends or publish rows.
import { campusParts, normalizePage, reconcileRecords } from './normalize.mjs'

const MAX_BYTES = 2_000_000
const MAX_EVENTS = 2000
const UID = /^(\d{8}T\d{6}Z)-(\d{1,20})@events\.scu\.edu$/

function decodeCalendar(bytes) {
  if (bytes.length > MAX_BYTES) throw new Error('Calendar exceeds size limit')
  // SCU folds even multi-byte UTF-8 sequences. Unfold bytes before decoding.
  const unfolded = Buffer.from(bytes.toString('latin1').replace(/\r?\n[ \t]/g, ''), 'latin1')
  return new TextDecoder('utf-8', { fatal: true }).decode(unfolded).replace(/\r\n/g, '\n')
}
function text(value) {
  return value?.replace(/\\([,;\\])/g, '$1').replace(/&amp;/g, '&').trim() || null
}
function utcSeconds(value) {
  const m = /^(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)Z$/.exec(value)
  if (!m) return null
  const iso = m[1] + '-' + m[2] + '-' + m[3] + 'T' + m[4] + ':' + m[5] + ':' + m[6] + 'Z'
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms) || new Date(ms).toISOString() !== iso.replace('Z', '.000Z')) return null
  return ms / 1000
}
function localValue(seconds) {
  const local = campusParts(new Date(seconds * 1000))
  return local.date.replaceAll('-', '') + 'T' + local.time.replace(':', '') + '00'
}
function readCalendar(bytes) {
  const input = decodeCalendar(bytes)
  if (!input.startsWith('BEGIN:VCALENDAR\n') || !input.trimEnd().endsWith('END:VCALENDAR')) {
    throw new Error('Incomplete calendar export')
  }
  const entries = new Map()
  let count = 0
  for (const match of input.matchAll(/^BEGIN:VEVENT\n([\s\S]*?)\nEND:VEVENT$/gm)) {
    if (++count > MAX_EVENTS) throw new Error('Calendar event limit exceeded')
    const fields = new Map()
    for (const line of match[1].split('\n')) {
      const colon = line.indexOf(':')
      if (colon < 0) continue
      const key = line.slice(0, colon)
      if (['UID', 'X-LIVEWHALE-ID', 'DTSTART;TZID=America/Los_Angeles',
        'DTEND;TZID=America/Los_Angeles', 'LOCATION', 'STATUS'].includes(key)) {
        if (fields.has(key)) throw new Error('Ambiguous calendar field: ' + key)
        fields.set(key, line.slice(colon + 1))
      }
    }
    const uid = UID.exec(fields.get('UID') ?? '')
    if (!uid || uid[2] !== fields.get('X-LIVEWHALE-ID')) continue
    const start = utcSeconds(uid[1])
    if (start === null) continue
    const key = uid[2] + ':' + start
    const location = text(fields.get('LOCATION'))
    const row = { location, start: fields.get('DTSTART;TZID=America/Los_Angeles'),
      end: fields.get('DTEND;TZID=America/Los_Angeles'), status: fields.get('STATUS') }
    const candidates = entries.get(key) ?? []
    candidates.push(row)
    entries.set(key, candidates)
  }
  if (!count || count !== (input.match(/^BEGIN:VEVENT$/gm) ?? []).length) throw new Error('Incomplete calendar event blocks')
  return { entries, count }
}

export function compareScuCaptures(payload, calendarBytes, source, checkedAt) {
  const page = normalizePage(payload, source, checkedAt)
  const meta = payload.meta
  if (meta?.type !== 'events' || !Number.isSafeInteger(meta.total_results) ||
      !Number.isSafeInteger(meta.per_page) || meta.per_page < 1 || meta.per_page > 1000 ||
      !Number.isSafeInteger(meta.page) || meta.page < 1 ||
      !Number.isSafeInteger(meta.total_pages) || meta.total_pages !== Math.ceil(meta.total_results / meta.per_page) ||
      meta.page > Math.max(1, meta.total_pages) ||
      page.records.length !== Math.min(meta.per_page, Math.max(0, meta.total_results - (meta.page - 1) * meta.per_page))) {
    throw new Error('Invalid captured JSON page counts')
  }
  const { entries, count } = readCalendar(calendarBytes)
  let matched = 0
  let locationRecovered = 0
  let calendarEndWithoutJsonEnd = 0
  const records = page.records.map((record, index) => {
    const matches = entries.get(record.providerId + ':' + record.startEpochSeconds) ?? []
    if (matches.length !== 1) return record
    matched++
    const entry = matches[0]
    // Require explicit Pacific DTSTART agreement before using location or end evidence.
    if (record.startEpochSeconds === null || entry.start !== localValue(record.startEpochSeconds)) return record
    const raw = payload.data[index]
    const recovered = !record.location && entry.location && !/[<>\u0000-\u001f]/.test(entry.location)
    if (recovered) locationRecovered++
    const enriched = recovered
      ? { ...record, location: entry.location, reasons: record.reasons.filter(reason => reason !== 'location-unavailable') }
      : { ...record, reasons: [...record.reasons] }
    if (recovered) enriched.locationEvidence = 'matching-ical'
    if (entry.end && record.endEpochSeconds === null) {
      calendarEndWithoutJsonEnd++
      enriched.reasons.push('calendar-end-unconfirmed')
    } else if (entry.end && entry.end !== localValue(record.endEpochSeconds)) {
      enriched.reasons.push('calendar-end-conflict')
    }
    if (entry.status && entry.status !== 'CONFIRMED') enriched.reasons.push('calendar-status-review')
    if (raw.location && entry.location && record.location && record.location !== entry.location) {
      enriched.reasons.push('calendar-location-conflict')
    }
    enriched.reviewState = enriched.reasons.length ? 'held' : 'awaiting-review'
    return enriched
  })
  return { version: 1, provider: source.id, checkedAt, complete: false, // never a complete refresh
    reportedTotal: meta.total_results, page: meta.page, reportedPages: meta.total_pages,
    received: page.records.length, calendarEntries: count, matched, locationRecovered,
    calendarEndWithoutJsonEnd, records: reconcileRecords(records) }
}
