// A neutral exchange format for organizer-approved exports.
// This does not claim Qlusion has a native API or emits this format.
import { campusParts, reconcileRecords } from './normalize.mjs'

const MAX_RECORDS = 1000
const EXPLICIT_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/
const MAX_LENGTH = 500

function plain(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > MAX_LENGTH ||
      /[<>\u0000-\u001f]/.test(value)) return null
  return value.trim()
}

function instant(value) {
  if (typeof value !== 'string' || !EXPLICIT_OFFSET.test(value)) return null
  const millis = Date.parse(value)
  if (!Number.isFinite(millis)) return null
  const date = value.slice(0, 10)
  const calendar = new Date(date + 'T00:00:00Z')
  if (!Number.isFinite(calendar.getTime()) || calendar.toISOString().slice(0, 10) !== date ||
      +value.slice(11, 13) > 23 || +value.slice(14, 16) > 59 || +value.slice(17, 19) > 59) return null
  return millis / 1000
}

function eventLink(value, source) {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.origin !== new URL(source.page).origin ||
        url.username || url.password) return null
    url.search = ''
    url.hash = ''
    return url.href
  } catch { return null }
}

function normalizeExportRow(row, source, checkedAt) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('Invalid export row')
  if (typeof row.occurrenceId !== 'string' || !/^[A-Za-z0-9._:@-]{1,160}$/.test(row.occurrenceId)) {
    throw new Error('A genuine, stable source occurrence ID is required')
  }
  const title = plain(row.title)
  const location = plain(row.location)
  const listedCalendar = plain(row.organizer)
  const sourceUrl = eventLink(row.sourceUrl, source)
  const start = instant(row.startsAt)
  const end = instant(row.endsAt)
  const startLocal = start === null ? null : campusParts(new Date(start * 1000))
  const endLocal = end === null ? null : campusParts(new Date(end * 1000))
  const reasons = []
  if (!title) reasons.push('title-unavailable')
  if (!location) reasons.push('location-unavailable')
  if (!listedCalendar) reasons.push('organizer-unverified')
  if (!sourceUrl) reasons.push('event-link-unavailable')
  if (start === null) reasons.push('start-unavailable')
  if (end === null) reasons.push('end-unavailable')
  if (row.status !== 'scheduled') reasons.push(row.status === 'canceled' ? 'canceled' : 'status-review')
  if (row.audience !== 'public' && row.audience !== 'scu-students') reasons.push('eligibility-review')
  if (start !== null && start * 1000 <= Date.parse(checkedAt)) reasons.push('already-started')
  if (startLocal && endLocal && (end <= start || endLocal.date !== startLocal.date ||
      endLocal.time <= startLocal.time)) reasons.push('outside-same-day-contract')
  return {
    occurrenceKey: source.id + ':' + row.occurrenceId,
    providerId: row.occurrenceId, provider: source.id, sourceUrl, checkedAt,
    title, listedCalendar, location, date: startLocal?.date ?? null,
    start: startLocal?.time ?? null, end: endLocal?.time ?? null,
    startEpochSeconds: start, endEpochSeconds: end,
    reviewState: reasons.length ? 'held' : 'awaiting-review',
    reasons,
  }
}

export function normalizeOrganizerExport(payload, source, { approvedExport = false, now = new Date() } = {}) {
  if (!approvedExport) throw new Error('Organizer export and reuse approval required')
  if (!source || !/^[a-z][a-z0-9-]{1,63}$/.test(source.id) || new URL(source.page).protocol !== 'https:') {
    throw new Error('Invalid registered source')
  }
  if (!payload || payload.version !== 1 || payload.provider !== source.id ||
      !Array.isArray(payload.events) || payload.events.length > MAX_RECORDS) throw new Error('Invalid organizer export')
  const checkedAt = now.toISOString()
  return {
    version: 1, provider: source.id, checkedAt, complete: false,
    // No assertion that an export contains everything; absence never means canceled.
    received: payload.events.length,
    records: reconcileRecords(payload.events.map(row => normalizeExportRow(row, source, checkedAt))),
  }
}
