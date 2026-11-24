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
const payload = (data, next = null) => ({ data, links: { next } })
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
  const next = source.feed + 'start_date/2026-11-24/page/2/'
  const result = await collectLiveWhale(source, {
    approvedRead: true, now, pause: async () => {},
    fetchImpl: async (url, options) => {
      calls.push(url)
      assert.equal(options.redirect, 'error')
      return calls.length === 1 ? response(payload([row], next)) : response(payload([row]))
    },
  })
  assert.match(calls[0], /start_date\/2026-11-24\/end_date\/2027-01-08\//)
  assert.equal(calls[1], next)
  assert.equal(result.pages, 2)
  assert.equal(result.received, 2)
  assert.equal(result.records.length, 1)
  assert.equal(result.complete, true)
})
test('rejects unsafe pagination and HTTP failure instead of returning a partial snapshot', async () => {
  const options = { approvedRead: true, now, pause: async () => {} }
  await assert.rejects(collectLiveWhale(source, { ...options,
    fetchImpl: async () => response(payload([row], 'https://unapproved.example/')) }), /Unsafe/)
  await assert.rejects(collectLiveWhale(source, { ...options,
    fetchImpl: async () => response({}, 429) }), /429/)
})
test('an actual empty feed is different from a broken feed', async () => {
  const options = { approvedRead: true, now, fetchImpl: async () => response(payload([])) }
  assert.deepEqual((await collectLiveWhale(source, options)).records, [])
  await assert.rejects(collectLiveWhale(source, { ...options,
    fetchImpl: async () => new Response('<html>Login</html>') }), /did not return JSON/)
})
