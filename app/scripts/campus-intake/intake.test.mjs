import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeLiveWhale, normalizePage, reconcileRecords } from './normalize.mjs'
import { collectLiveWhale } from './collect.mjs'

const source = { id: 'scu-livewhale', adapter: 'livewhale-v2', page: 'https://events.scu.edu/all',
  feed: 'https://events.scu.edu/live/json/v2/events/' }
const now = new Date('2026-11-24T19:00:00Z')
const checkedAt = now.toISOString()
const seconds = iso => Date.parse(iso) / 1000
const row = {
  id: 123456, title: 'Synthetic Arts Workshop', group_title: 'Example department', location: 'Example room',
  href: '/event/123456-example', date_ts: seconds('2026-12-01T22:30:00Z'),
  date2_ts: seconds('2026-12-02T00:00:00Z'), is_all_day: false, is_canceled: false,
}
const normalize = changes => normalizeLiveWhale({ ...row, ...changes }, source, checkedAt)
const payload = (data, next = null, total = data.length, page = 1) => ({
  data, links: { next }, meta: { type: 'events', total_results: total,
    total_pages: Math.ceil(total / 100), per_page: 100, page },
})
const response = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type': 'application/json' },
})

test('normalizes a source occurrence in Pacific time without publishing it', () => {
  const result = normalize({})
  assert.equal(result.date, '2026-12-01')
  assert.equal(result.start, '14:30')
  assert.equal(result.end, '16:00')
  assert.equal(result.sourceUrl, 'https://events.scu.edu/event/123456-example')
  assert.equal(result.reviewState, 'awaiting-review')
  assert.equal(result.providerId, '123456')
})
test('converts summer and winter offsets correctly', () => {
  const summer = normalize({ date_ts: seconds('2027-07-01T21:30:00Z'),
    date2_ts: seconds('2027-07-01T22:30:00Z') })
  assert.equal(summer.start, '14:30')
  assert.equal(summer.end, '15:30')
})
test('unknown end, all-day, recurring, canceled, expired and overnight records stay held', () => {
  for (const [changes, reason] of [
    [{ date2_ts: null }, 'end-unavailable'],
    [{ is_all_day: true }, 'all-day'],
    [{ is_repeating: true }, 'recurrence-review'],
    [{ is_canceled: 1 }, 'canceled'],
    [{ date_ts: seconds('2026-11-23T22:30:00Z') }, 'already-started'],
    [{ date2_ts: seconds('2026-12-02T09:00:00Z') }, 'outside-same-day-contract'],
    [{ date2_ts: row.date_ts }, 'invalid-interval'],
    [{ href: 'https://unapproved.example/event/123456' }, 'event-link-unavailable'],
    [{ location: '<script>bad</script>' }, 'location-unavailable'],
  ]) {
    const result = normalize(changes)
    assert.equal(result.reviewState, 'held')
    assert.ok(result.reasons.includes(reason), reason)
  }
  assert.equal(normalize({ date2_ts: null }).end, null)
})
test('same event at different performance times stays separate', () => {
  const another = normalize({ date_ts: row.date_ts + 86400, date2_ts: row.date2_ts + 86400 })
  assert.equal(reconcileRecords([normalize({}), another]).length, 2)
})
test('exact duplicate collapses, conflicting duration or another provider ID holds all variants', () => {
  const first = normalize({})
  assert.equal(reconcileRecords([first, first]).length, 1)
  const conflict = reconcileRecords([first, normalize({ date2_ts: row.date2_ts + 3600 })])
  assert.equal(conflict.length, 2)
  assert.ok(conflict.every(record => record.reasons.includes('source-record-conflict')))
  const duplicate = reconcileRecords([first, normalize({ id: 987654 })])
  assert.equal(duplicate.length, 2)
  assert.ok(duplicate.every(record => record.reasons.includes('possible-duplicate')))
})
test('rejects unknown schemas and missing external identity', () => {
  assert.throws(() => normalize({ id: null }), /provider event ID/)
  assert.throws(() => normalizePage([row], source, checkedAt), /Unexpected/)
})
test('approval gate makes no requests', async () => {
  let called = false
  await assert.rejects(collectLiveWhale(source, { now, fetchImpl: async () => { called = true } }), /approval/)
  assert.equal(called, false)
})
test('reads fresh time windows and traverses bounded pagination', async () => {
  const calls = []
  const firstPage = Array.from({ length: 100 }, (_, i) => ({ ...row, id: 123456 + i }))
  let next
  const result = await collectLiveWhale(source, {
    approvedRead: true, now, pause: async () => {},
    fetchImpl: async (url, options) => {
      calls.push(url)
      assert.equal(options.redirect, 'error')
      if (calls.length === 1) {
        next = url + '?page=2'
        return response(payload(firstPage, next, 101))
      }
      return response(payload([{ ...row, id: 123556 }], null, 101, 2))
    },
  })
  assert.match(calls[0], /start_date\/2026-11-24\/end_date\/2027-01-08\//)
  assert.equal(calls[1], next)
  assert.equal(result.pages, 2)
  assert.equal(result.received, 101)
  assert.equal(result.records.length, 101)
  assert.equal(result.complete, true)
})
test('rejects unsafe pagination and HTTP failure instead of returning a partial snapshot', async () => {
  const options = { approvedRead: true, now, pause: async () => {} }
  await assert.rejects(collectLiveWhale(source, { ...options,
    fetchImpl: async () => response(payload(Array(100).fill(row), 'https://unapproved.example/', 101)) }), /Unsafe/)
  await assert.rejects(collectLiveWhale(source, { ...options,
    fetchImpl: async () => response({}, 429) }), /429/)
})
test('an actual empty feed is different from a broken feed', async () => {
  const options = { approvedRead: true, now, fetchImpl: async () => response(payload([])) }
  assert.deepEqual((await collectLiveWhale(source, options)).records, [])
  await assert.rejects(collectLiveWhale(source, { ...options,
    fetchImpl: async () => new Response('<html>Login</html>') }), /did not return JSON/)
})

test('rejects truncated or capped results and drifting totals', async () => {
  const options = { approvedRead: true, now, pause: async () => {} }
  await assert.rejects(collectLiveWhale(source, { ...options,
    fetchImpl: async () => response(payload([row], null, 101)) }), /page count/)
  await assert.rejects(collectLiveWhale(source, { ...options,
    fetchImpl: async () => response(payload([], null, 1000)) }), /result cap/)
  let calls = 0
  await assert.rejects(collectLiveWhale(source, { ...options, fetchImpl: async url => {
    calls++
    return calls === 1
      ? response(payload(Array(100).fill(row), url + '?page=2', 101))
      : response(payload([row], null, 102, 2))
  } }), /Pagination changed/)
  await assert.rejects(collectLiveWhale(source, { ...options,
    fetchImpl: async url => response(payload(Array(100).fill(row), url + '?page=2&include_hidden=1', 101)) }), /Unexpected pagination query/)
})

const { normalizeOrganizerExport } = await import('./organizerExport.mjs')
const qlusion = { id: 'qlusion', page: 'https://www.qlusion.com/' }
const clubEvent = {
  occurrenceId: 'club-event-42', title: 'Synthetic club activity', organizer: 'Example club',
  location: 'Example room', sourceUrl: 'https://www.qlusion.com/events/42',
  startsAt: '2026-12-01T14:00:00-08:00', endsAt: '2026-12-01T15:00:00-08:00',
  status: 'scheduled', audience: 'scu-students',
}
const clubExport = events => ({ version: 1, provider: 'qlusion', events })
const exportOptions = { approvedExport: true, now }

test('approved exports retain stable source IDs even when the event moves', () => {
  const a = normalizeOrganizerExport(clubExport([clubEvent]), qlusion, exportOptions)
  const b = normalizeOrganizerExport(clubExport([{ ...clubEvent,
    startsAt: '2026-12-02T14:00:00-08:00', endsAt: '2026-12-02T15:00:00-08:00' }]), qlusion, exportOptions)
  assert.equal(a.records[0].occurrenceKey, b.records[0].occurrenceKey)
  assert.equal(a.records[0].date, '2026-12-01')
  assert.equal(b.records[0].date, '2026-12-02')
  assert.equal(a.records[0].reviewState, 'awaiting-review')
  assert.equal(a.complete, false)
})
test('organizer exports fail closed without approval or genuine ID', () => {
  assert.throws(() => normalizeOrganizerExport(clubExport([clubEvent]), qlusion), /approval/)
  assert.throws(() => normalizeOrganizerExport(clubExport([{ ...clubEvent, occurrenceId: '' }]), qlusion, exportOptions), /stable/)
  assert.throws(() => normalizeOrganizerExport({ ...clubExport([]), provider: 'other' }, qlusion, exportOptions), /Invalid organizer export/)
})
test('export keeps unknown times, cancellation and restricted audiences in review', () => {
  for (const [changes, reason] of [
    [{ startsAt: '2026-12-01T14:00:00' }, 'start-unavailable'],
    [{ startsAt: '2027-02-30T14:00:00Z' }, 'start-unavailable'],
    [{ endsAt: null }, 'end-unavailable'],
    [{ status: 'canceled' }, 'canceled'],
    [{ audience: 'invite-only' }, 'eligibility-review'],
    [{ sourceUrl: 'https://unapproved.example/42' }, 'event-link-unavailable'],
  ]) {
    const result = normalizeOrganizerExport(clubExport([{ ...clubEvent, ...changes }]), qlusion, exportOptions)
    assert.equal(result.records[0].reviewState, 'held')
    assert.ok(result.records[0].reasons.includes(reason))
  }
})

const { planReviewedSynchronization } = await import('./reviewedSyncPlan.mjs')
const eventId = '12345678-1234-4234-8234-123456789012'
const mapping = { provider: 'qlusion', occurrenceId: 'club-event-42', eventId, revision: 3 }
const decision = { provider: mapping.provider, occurrenceId: mapping.occurrenceId,
  approved: true, identityVerified: true, expectedRevision: 3, intent: 'publish',
  candidate: { date: '2026-12-02', start: '14:00', end: '15:00' } }
const plan = (changes = {}, options = {}) => planReviewedSynchronization({
  mappings: [mapping], catalog: [{ id: eventId, origin: 'imported' }],
  decisions: [{ ...decision, ...changes }], ...options,
})

test('reviewed time changes preserve existing event UUID; stale review is held', () => {
  const result = plan()[0]
  assert.equal(result.action, 'propose-update')
  assert.equal(result.eventId, eventId)
  assert.equal(result.expectedRevision, 3)
  assert.equal(plan({ expectedRevision: 2 })[0].reason, 'stale-review')
})
test('absence never cancels events and cancellation requires explicit evidence', () => {
  assert.deepEqual(plan({}, { decisions: [] }), [])
  assert.equal(plan({ intent: 'cancel' })[0].reason, 'cancellation-evidence-required')
  assert.equal(plan({ intent: 'cancel', explicitCancellation: true })[0].action, 'propose-cancel')
})
test('manual posts and multi-source records are not automatically modified', () => {
  assert.equal(plan({}, { catalog: [{ id: eventId, origin: 'manual' }] })[0].action, 'hold')
  assert.equal(plan({}, { mappings: [mapping, { ...mapping, provider: 'scu-livewhale' }] })[0].action, 'hold')
})
test('new source records require explicit identity and duplicate review', () => {
  const options = { mappings: [], catalog: [] }
  assert.equal(plan({ identityVerified: false }, options)[0].reason, 'review-required')
  assert.equal(plan({ possibleDuplicate: true }, options)[0].reason, 'duplicate-review-required')
  assert.equal(plan({ possibleDuplicate: false }, options)[0].action, 'propose-create')
  assert.equal(plan({ intent: 'cancel' }, options)[0].action, 'hold')
})
test('rejects duplicate decisions and invalid persistent mappings', () => {
  assert.throws(() => plan({}, { decisions: [decision, decision] }), /Multiple decisions/)
  assert.throws(() => plan({}, { catalog: [] }), /orphaned/)
})

test('same stable export ID with conflicting start times is not silently collapsed', () => {
  const snapshot = normalizeOrganizerExport(clubExport([clubEvent, { ...clubEvent,
    startsAt: '2026-12-01T14:30:00-08:00' }]), qlusion, exportOptions)
  assert.equal(snapshot.records.length, 2)
  assert.ok(snapshot.records.every(record => record.reasons.includes('source-record-conflict')))
})
test('organizer export source URLs never retain arbitrary query strings', () => {
  const snapshot = normalizeOrganizerExport(clubExport([{ ...clubEvent,
    sourceUrl: clubEvent.sourceUrl + '?token=fixture-only#section' }]), qlusion, exportOptions)
  assert.equal(snapshot.records[0].sourceUrl, clubEvent.sourceUrl)
})

test('a reviewed publish decision still requires a valid same-day interval', () => {
  for (const candidate of [null, {}, { date: '2026-02-30', start: '14:00', end: '15:00' },
    { date: '2026-12-02', start: '14:00', end: null },
    { date: '2026-12-02', start: '14:00', end: '14:00' },
    { date: '2026-12-02', start: '25:00', end: '26:00' }]) {
    assert.equal(plan({ candidate })[0].reason, 'invalid-candidate-interval')
    assert.equal(plan({ candidate, possibleDuplicate: false }, { mappings: [], catalog: [] })[0].reason,
      'invalid-candidate-interval')
  }
})
