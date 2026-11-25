// Review queue: puts every source's value for each field side by side, with its passage.
// Nothing here writes the catalog. A candidate reaches "ready" only after reviewers agree,
// and an event without a verified end never does (architecture review v5.1, pages 6 and 12).
//
// Lessons built in (BroncosGo thesis 2026; SCU feed and newsletter audit, Nov 24, 2026):
// - identity comes from a direct event link or the provider ID, never from similar titles;
// - SCU's iCal export gives every event without an end exactly one hour, so iCal never supplies an end;
// - a newsletter can carry the right time and the wrong speaker, so a second value is a dispute, not an update;
// - each field is approved, edited or flagged by more than one reviewer before anything is published.

const DEADLINE = /\b(deadline|due|last day|apply by)\b/i
export const REQUIRED_FIELDS = ['title', 'date', 'start', 'end', 'location']
export const REVIEW_FIELDS = [...REQUIRED_FIELDS, 'host', 'speaker', 'contact', 'accessibility']
export const DEFAULT_REVIEWERS = 2
// SCU's Access Policy Statement for any event marketing (CSI advertising guidelines, checked Nov 24, 2026).
export const ADA_STATEMENT = 'In compliance with the ADA/504, please direct your accommodation requests to NAME at EMAIL ADDRESS.'

const norm = value => typeof value === 'string'
  ? value.normalize('NFKC').toLowerCase().replace(/[–—]/g, '-').replace(/[^\p{L}\p{N}:@.-]+/gu, ' ').trim()
  : value
const titleKey = value => (value ?? '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/^(the|a)\s+/, '')
const words = value => new Set(titleKey(value).split(' ').filter(w => w.length > 3))

/** Several distinct provider IDs for one production on nearby days are separate showtimes. Never merge them. */
export function markShowtimes(records) {
  const groups = new Map()
  for (const r of records) {
    if (!r.title || r.occurrenceKind === 'deadline' || r.occurrenceKind === 'repeating') continue
    const key = titleKey(r.title) + '|' + (r.groupId ?? r.listedCalendar ?? '')
    groups.set(key, [...(groups.get(key) ?? []), r])
  }
  const showtimes = new Map()
  for (const [key, group] of groups) {
    const ids = new Set(group.map(r => r.providerId))
    const starts = new Set(group.map(r => r.startEpochSeconds))
    if (ids.size > 1 && starts.size === ids.size) for (const r of group) showtimes.set(r.occurrenceKey, key)
  }
  return records.map(r => showtimes.has(r.occurrenceKey)
    ? { ...r, occurrenceKind: 'showtime', production: showtimes.get(r.occurrenceKey) } : r)
}

function value(source, field, v, passage) {
  return v === null || v === undefined || v === '' ? null : { source, value: v, passage: passage ?? null }
}

function calendarValues(r) {
  const allDay = r.reasons?.includes('all-day')
  return {
    title: value('scu-calendar', 'title', r.title),
    date: value('scu-calendar', 'date', r.date),
    start: allDay ? value('scu-calendar', 'start', 'all day') : value('scu-calendar', 'start', r.start),
    end: allDay ? value('scu-calendar', 'end', 'all day') : value('scu-calendar', 'end', r.end),
    location: value('scu-calendar', 'location', r.location),
    host: value('scu-calendar', 'host', r.listedCalendar),
  }
}
function newsletterValues(n) {
  const src = 'newsletter:' + n.issue + ':' + n.part
  return {
    title: value(src, 'title', n.title, n.evidence?.title), date: value(src, 'date', n.date, n.evidence?.date),
    start: value(src, 'start', n.start, n.evidence?.start), end: value(src, 'end', n.end, n.evidence?.end),
    location: value(src, 'location', n.location, n.evidence?.location),
    speaker: value(src, 'speaker', n.speaker, n.evidence?.speaker),
    contact: value(src, 'contact', n.contact, n.evidence?.contact),
    accessibility: value(src, 'accessibility', n.accessibility, n.evidence?.accessibility),
  }
}

/** Ends offered by other sources. iCal is refused outright: it invents a one-hour default. */
function extraEnd(e) {
  if (e.field !== 'end') return null
  if (e.source === 'ical-export') return { refused: { source: e.source, value: e.value, reason: 'ical-default-duration' } }
  return { value: value(e.source, 'end', e.value, e.passage) }
}

function fieldState(values, field) {
  const seen = values.filter(Boolean)
  if (!seen.length) return { state: 'missing', values: [] }
  // A title may differ between sources once identity is proven by a link; the calendar title stays canonical.
  const distinct = new Set(seen.map(v => field === 'title' ? titleKey(v.value) : norm(v.value)))
  if (distinct.size === 1) return { state: seen.length > 1 ? 'agreed' : 'single-source', values: seen }
  return { state: 'disputed', values: seen }
}

/**
 * Builds review candidates from the calendar snapshot, newsletter rows and extra evidence
 * (ticket pages, iCal exports). Newsletter rows join a calendar row only through a link to it.
 */
export function buildCandidates({ calendar = [], newsletter = [], evidence = [] } = {}) {
  const records = markShowtimes(calendar)
  const byProvider = new Map(records.map(r => [r.providerId, r]))
  const candidates = []
  const used = new Set()
  for (const r of records) {
    const joined = newsletter.filter(n => n.linkedProviderId === r.providerId)
    joined.forEach(n => used.add(n))
    candidates.push({ key: r.occurrenceKey, providerId: r.providerId, kind: r.occurrenceKind, production: r.production ?? null,
      calendar: r, newsletters: joined, evidence: evidence.filter(e => e.providerId === r.providerId), possibleMatches: [] })
  }
  // Newsletter-only rows: the same issue mentioning the same date, start and place twice is one candidate.
  const loose = new Map()
  for (const n of newsletter) {
    if (used.has(n)) continue
    if (n.linkedProviderId && !byProvider.has(n.linkedProviderId)) {
      // Links to a calendar event outside this snapshot: keep the link for the reviewer.
    }
    const key = [n.issue, n.date, n.start, norm(n.location ?? '')].join('|')
    loose.set(key, [...(loose.get(key) ?? []), n])
  }
  for (const [key, rows] of loose) {
    const sample = rows[0]
    // Similar titles on the same day are only suggestions for a reviewer. They never join records.
    const possibleMatches = records.filter(r => r.date === sample.date &&
      [...words(sample.title)].some(w => words(r.title).has(w))).map(r => r.providerId)
    candidates.push({ key: 'newsletter:' + key, providerId: sample.linkedProviderId ?? null, kind: 'single', production: null,
      calendar: null, newsletters: rows, evidence: [], possibleMatches })
  }
  return candidates.map(describe)
}

function describe(c) {
  const sources = [c.calendar ? calendarValues(c.calendar) : {}, ...c.newsletters.map(newsletterValues)]
  const refused = []
  const ends = []
  for (const e of c.evidence) {
    const r = extraEnd(e)
    if (r?.refused) refused.push(r.refused)
    else if (r?.value) ends.push(r.value)
  }
  const fields = {}
  for (const f of REVIEW_FIELDS) {
    let values = sources.map(s => s[f]).filter(Boolean)
    // Once a link proves identity, the calendar title is canonical and other titles are aliases.
    if (f === 'title' && c.calendar?.title) values = values.filter(v => v.source === 'scu-calendar')
    if (f === 'end') values.push(...ends)
    fields[f] = fieldState(values, f)
  }
  const aliases = c.calendar?.title
    ? [...new Set(c.newsletters.map(n => n.title).filter(t => t && titleKey(t) !== titleKey(c.calendar.title)))] : []
  // An end from anything but the calendar feed itself waits for a reviewer, even when nothing disagrees.
  if (fields.end.state === 'single-source' && fields.end.values[0].source !== 'scu-calendar') fields.end.state = 'unconfirmed'
  const flags = []
  if (c.calendar?.reasons?.includes('canceled')) flags.push('canceled')
  const deadlineOnly = !c.calendar && c.newsletters.every(n => DEADLINE.test(n.title ?? ''))
  if (c.kind === 'deadline' || deadlineOnly) flags.push('not-an-event')
  if (c.kind === 'showtime') flags.push('showtime-kept-separate')
  if (!c.calendar) flags.push(c.possibleMatches.length ? 'newsletter-only-possible-calendar-match' : 'newsletter-only')
  if (fields.contact.state === 'missing' || fields.accessibility.state === 'missing') flags.push('ada-contact-missing')
  if (refused.length) flags.push('ical-end-ignored')
  return { ...c, fields, aliases, refusedEvidence: refused, flags }
}

/**
 * Reviews: [{ reviewer, decisions: { field: { action: 'confirm' | 'edit' | 'flag', value? } },
 *            linkProviderId?, policyAck?: 'statement-present' | 'university-department' }].
 * A field is verified when `threshold` different reviewers settle on the same value.
 */
export function applyReviews(candidate, reviews = [], threshold = DEFAULT_REVIEWERS) {
  const byReviewer = new Map()
  for (const r of reviews) if (r?.reviewer) byReviewer.set(r.reviewer, r) // a reviewer's latest review counts once
  const settled = {}
  const flagged = new Set()
  for (const f of REVIEW_FIELDS) {
    const votes = new Map()
    for (const r of byReviewer.values()) {
      const d = r.decisions?.[f]
      if (!d) continue
      if (d.action === 'flag') { flagged.add(f); continue }
      const chosen = d.action === 'edit' ? d.value : candidate.fields[f].values[0]?.value
      if (d.action === 'confirm' && candidate.fields[f].state === 'disputed') continue // a dispute needs an explicit value
      if (chosen === undefined || chosen === null || chosen === '') continue
      votes.set(norm(chosen), { value: chosen, count: (votes.get(norm(chosen))?.count ?? 0) + 1 })
    }
    const winner = [...votes.values()].find(v => v.count >= threshold)
    if (winner) settled[f] = winner.value
  }
  const reviewers = byReviewer.size
  const policy = [...byReviewer.values()].some(r => r.policyAck)
  return { ...candidate, review: { reviewers, threshold, settled, flagged: [...flagged], policyAck: policy } }
}

/** Where a candidate stands. Only 'ready' may go to the catalog, through the existing reviewed-publication path. */
export function status(candidate) {
  const f = candidate.fields
  const s = candidate.review?.settled ?? {}
  // Without reviewers, only values backed by the calendar feed count. Two mentions in one email are not two sources.
  const verified = field => field in s || ((f[field].state === 'agreed' || f[field].state === 'single-source') &&
    f[field].values.some(v => v.source === 'scu-calendar'))
  if (candidate.flags.includes('canceled')) return 'canceled'
  if (candidate.flags.includes('not-an-event')) return 'not-an-event'
  if (REVIEW_FIELDS.some(x => f[x].state === 'disputed' && !(x in s))) return 'disputed'
  const endValue = s.end ?? (verified('end') ? f.end.values[0]?.value : null)
  if (!endValue || endValue === 'all day') return 'held-no-verified-end'
  if (candidate.review?.flagged?.length) return 'flagged-missing'
  if (!REQUIRED_FIELDS.every(verified)) return 'needs-review'
  if (candidate.flags.includes('ada-contact-missing') && !candidate.review?.policyAck) return 'needs-ada-contact'
  if ((candidate.review?.reviewers ?? 0) < (candidate.review?.threshold ?? DEFAULT_REVIEWERS)) return 'needs-more-reviewers'
  return 'ready'
}

/**
 * Would a naive importer have published this wrongly? It takes iCal ends, joins by title, lets the newest
 * newsletter value overwrite, and publishes all-day rows with newsletter times.
 */
function naiveWouldPublish(c) {
  const hasIcal = c.refusedEvidence.length > 0
  const endMissing = c.fields.end.state === 'missing' || c.fields.end.state === 'unconfirmed'
  return (endMissing && hasIcal) || c.flags.includes('newsletter-only-possible-calendar-match') ||
    REVIEW_FIELDS.some(x => c.fields[x].state === 'disputed')
}

export function metrics(candidates) {
  const states = candidates.map(c => ({ c, s: status(c) }))
  return {
    candidates: candidates.length,
    scheduleReady: states.filter(x => x.s === 'ready').length,
    heldNoVerifiedEnd: states.filter(x => x.s === 'held-no-verified-end').length,
    disputed: states.filter(x => x.s === 'disputed').length,
    reviewItems: states.filter(x => !['ready', 'canceled', 'not-an-event'].includes(x.s)).length,
    // Count of rows this pipeline holds that a naive importer would have published with a wrong fact.
    wouldMispublishIfNaive: states.filter(x => x.s !== 'ready' && naiveWouldPublish(x.c)).length,
    icalEndsRefused: candidates.reduce((n, c) => n + c.refusedEvidence.length, 0),
  }
}

/**
 * A reviewer has checked that a newsletter-only candidate is the same event as a calendar row
 * (for example, the same room and date and a matching registration page). The rows join, and
 * any field that now disagrees becomes a dispute. Nothing is overwritten.
 */
export function confirmLink(candidates, newsletterKey, providerId) {
  const from = candidates.find(c => c.key === newsletterKey && !c.calendar)
  const to = candidates.find(c => c.calendar?.providerId === providerId)
  if (!from || !to) throw new Error('Unknown candidate or calendar row')
  const merged = describe({ ...to, newsletters: [...to.newsletters, ...from.newsletters], linkedBy: 'reviewer' })
  return candidates.filter(c => c !== from && c !== to).concat(merged)
}
