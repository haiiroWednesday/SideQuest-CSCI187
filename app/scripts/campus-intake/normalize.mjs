// Read-only source adapter. Records are review candidates, never public events.
// LiveWhale API v2 format: data[], links.next; date_ts/date2_ts are Unix seconds.
// Unknown, all-day, recurring and multi-day data are retained for review.
const CAMPUS_ZONE = 'America/Los_Angeles'
const campusClock = new Intl.DateTimeFormat('en-CA', {
  timeZone: CAMPUS_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})

export function campusParts(instant) {
  const parts = Object.fromEntries(campusClock.formatToParts(instant).map(p => [p.type, p.value]))
  return { date: parts.year + '-' + parts.month + '-' + parts.day, time: parts.hour + ':' + parts.minute }
}

function unixSeconds(value) {
  if (typeof value === 'string' && /^\d{10}$/.test(value)) value = Number(value)
  return Number.isSafeInteger(value) && value >= 946684800 && value < 4102444800
    ? value : null
}

function text(value) {
  // Treat untrusted markup as unavailable rather than rendering HTML or copying descriptions.
  return typeof value === 'string' && !/[<>]/.test(value) ? value.trim() : ''
}
function flag(value) { return value === true || value === 1 || value === '1' }
function knownFalse(value) { return value === false || value === 0 || value === '0' }
function marked(value) { return value !== undefined && value !== null && !knownFalse(value) }

function sourceLink(value, source) {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    const url = new URL(value, source.page)
    if (url.protocol !== 'https:' || url.host !== new URL(source.page).host ||
        url.username || url.password || !/\/(?:event|live\/events)\/\d+(?:[-/]|$)/.test(url.pathname)) return null
    url.search = ''
    url.hash = ''
    return url.href
  } catch { return null }
}

function modifiedAt(value) {
  // SCU sends Unix seconds (checked Nov 24, 2026); older captures may carry a date string.
  const seconds = unixSeconds(value)
  if (seconds !== null) return new Date(seconds * 1000).toISOString()
  return text(value) || null
}
function idText(value) {
  return (typeof value === 'string' || typeof value === 'number') && /^\d{1,20}$/.test(String(value)) ? String(value) : null
}
function list(value) {
  const items = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/[,|]/) : []
  return items.map(item => text(typeof item === 'string' ? item : item?.title)).filter(Boolean)
}
const DEADLINE = /\b(deadline|due|last day|apply by|applications? (?:due|close)|registration closes)\b/i
/**
 * single: one attendable occurrence. showtime: one of several bookable performances of a production
 * (each keeps its own provider ID). repeating: a series row (weekly mass, office hours). deadline: a date to
 * remember, never a Discover event.
 */
export function occurrenceKind(record, title, start, end) {
  if (DEADLINE.test(title) && (end === null || end === start || marked(record.is_all_day))) return 'deadline'
  if (marked(record.repeats) && record.repeats !== '' || marked(record.is_repeating)) return 'repeating'
  if (record.parent != null && idText(record.parent) !== idText(record.id)) return 'showtime'
  return 'single'
}

export function normalizeLiveWhale(record, source, checkedAt) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('Invalid event row')
  const providerId = typeof record.id === 'string' || typeof record.id === 'number' ? String(record.id) : ''
  if (!/^\d{1,20}$/.test(providerId)) throw new Error('Missing or invalid provider event ID')
  const title = text(record.title)
  const link = sourceLink(record.url ?? record.href, source)
  const start = unixSeconds(record.date_ts ?? record.ts_start)
  // An explicit null in SCU JSON means no published end, even if another field exists.
  const end = unixSeconds(Object.hasOwn(record, 'date2_ts') ? record.date2_ts : record.ts_end)
  const startLocal = start === null ? null : campusParts(new Date(start * 1000))
  const endLocal = end === null ? null : campusParts(new Date(end * 1000))
  const calendar = text(record.group_title)
  const location = text(record.location)
  const reasons = []
  if (!title) reasons.push('title-unavailable')
  if (!link) reasons.push('event-link-unavailable')
  if (!calendar) reasons.push('organizer-unverified')
  if (!location) reasons.push('location-unavailable')
  if (!startLocal) reasons.push('start-unavailable')
  if (!endLocal) reasons.push('end-unavailable')
  if (start !== null && end !== null && end <= start) reasons.push('invalid-interval')
  if (startLocal && endLocal && (startLocal.date !== endLocal.date || endLocal.time <= startLocal.time)) {
    reasons.push('outside-same-day-contract')
  }
  if (marked(record.is_all_day)) reasons.push('all-day')
  if (marked(record.is_multi_day)) reasons.push('multi-day')
  // A repeat ID alone is not a verified occurrence identity.
  if (marked(record.is_repeating) || marked(record.repeats) && record.repeats !== '' || record.parent != null) reasons.push('recurrence-review')
  if (marked(record.is_canceled)) reasons.push(flag(record.is_canceled) ? 'canceled' : 'cancellation-status-review')
  // A deadline ("applications due", "last day to ...") is a date, not something to attend.
  const kind = occurrenceKind(record, title, start, end)
  if (kind === 'deadline') reasons.push('deadline-not-attendable')
  const now = Date.parse(checkedAt)
  if (!Number.isFinite(now)) throw new Error('Invalid collection timestamp')
  if (start !== null && start * 1000 <= now) reasons.push('already-started')
  // Existing M2 records require a full same-day interval. Never synthesize it.
  const occurrenceKey = source.id + ':' + providerId + ':' + (start === null ? 'unknown' : start)
  return {
    occurrenceKey, providerId, provider: source.id, sourceUrl: link, checkedAt,
    title: title || null, listedCalendar: calendar || null, location: location || null,
    endEvidence: end === null ? 'missing' : 'source-json',
    // Upstream identity and freshness, kept so a moved occurrence keeps its SideQuest UUID.
    groupId: idText(record.gid), parentId: idText(record.parent), lastModified: modifiedAt(record.last_modified),
    eventTypes: list(record.event_types), registration: text(typeof record.registration === 'string' ? record.registration : '') || null,
    occurrenceKind: kind,
    date: startLocal?.date ?? null, start: startLocal?.time ?? null, end: endLocal?.time ?? null,
    startEpochSeconds: start, endEpochSeconds: end,
    reviewState: reasons.length ? 'held' : 'awaiting-review',
    reasons,
  }
}

export function normalizePage(payload, source, checkedAt) {
  if (!payload || !Array.isArray(payload.data) || !payload.links || typeof payload.links !== 'object' ||
      Array.isArray(payload.links) || !Object.hasOwn(payload.links, 'next')) {
    throw new Error('Unexpected LiveWhale v2 response; verify actual provider schema')
  }
  const records = payload.data.map(row => normalizeLiveWhale(row, source, checkedAt))
  if (payload.links.next !== null && typeof payload.links.next !== 'string') throw new Error('Invalid pagination link')
  return { records, next: payload.links.next }
}

function fingerprint(record) {
  const normalize = value => value?.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim()
  if (!record.title || !record.date || !record.start || !record.location) return null
  return JSON.stringify([normalize(record.title), record.date, record.start, normalize(record.location)])
}

// Collapse identical source occurrences only. A changed title/end/location or another
// provider's similar event is a review conflict, never permission to overwrite or delete.
export function reconcileRecords(records) {
  const groups = new Map()
  for (const row of records) {
    const group = groups.get(row.occurrenceKey) ?? []
    group.push(row)
    groups.set(row.occurrenceKey, group)
  }
  const result = []
  for (const group of groups.values()) {
    const variants = new Map(group.map(row => [JSON.stringify([
      row.title, row.listedCalendar, row.location, row.sourceUrl, row.startEpochSeconds, row.endEpochSeconds,
      row.reviewState, row.reasons, row.endEvidence,
    ]), row]))
    if (variants.size === 1) result.push(group[0])
    else for (const row of variants.values()) result.push({
      ...row, reviewState: 'held', reasons: [...row.reasons, 'source-record-conflict'],
    })
  }
  const fingerprints = new Map()
  for (const row of result) {
    const key = fingerprint(row)
    if (key) fingerprints.set(key, (fingerprints.get(key) ?? 0) + 1)
  }
  return result.map(row => {
    const key = fingerprint(row)
    return key && fingerprints.get(key) > 1
      ? { ...row, reviewState: 'held', reasons: [...row.reasons, 'possible-duplicate'] }
      : row
  }).sort((a, b) => a.occurrenceKey.localeCompare(b.occurrenceKey))
}
