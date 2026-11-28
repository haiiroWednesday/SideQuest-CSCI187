// Known answers from SCU's own sources (see fixtures/scuKnownAnswers.mjs for which values were live-checked).
import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeLiveWhale } from './normalize.mjs'
import { collectLiveWhale, RESPONSE_FIELDS } from './collect.mjs'
import { parseEngineeringNewsletter, parseTimeRange, liveWhaleIdFromLink, accessFrom } from './newsletter.mjs'
import { buildCandidates, applyReviews, confirmLink, confirmByOrganizer, status, metrics, browseListing, eligibleForFreeTime } from './review.mjs'
import { normalizeLiveWhale as normalizeRow, scuCalendarId } from './normalize.mjs'
import { parseInstagramLead, instagramPostUrl } from './instagram.mjs'
import { acceptAiEvents, extractWithAi } from './aiExtraction.mjs'
import * as F from './fixtures/scuKnownAnswers.mjs'

const calendar = () => F.CALENDAR_ROWS.map(r => normalizeLiveWhale(r, F.SOURCE, F.CHECKED_AT))
const newsletter = () => [
  ...parseEngineeringNewsletter(F.NEWSLETTER_W7.html, F.NEWSLETTER_W7.issue),
  ...parseEngineeringNewsletter(F.NEWSLETTER_W9.html, F.NEWSLETTER_W9.issue),
]
const all = () => buildCandidates({ calendar: calendar(), newsletter: newsletter(), evidence: F.EXTRA_EVIDENCE })
const byProvider = (cs, id) => cs.find(c => c.calendar?.providerId === id)
const loose = (cs, title) => cs.find(c => !c.calendar && c.newsletters.some(n => n.title.startsWith(title)))
const twoReviewers = (decisions, more = {}) => [{ reviewer: 'r1', decisions, ...more }, { reviewer: 'r2', decisions, ...more }]

test('asks LiveWhale for the fields its default JSON leaves out', async () => {
  const seen = []
  const fetchImpl = async url => {
    seen.push(url)
    return new Response(JSON.stringify({ data: [], links: { next: null }, meta: { type: 'events', total_results: 0, total_pages: 0, per_page: 100, page: 1 } }),
      { status: 200, headers: { 'content-type': 'application/json' } })
  }
  await collectLiveWhale(F.SOURCE, { approvedRead: true, fetchImpl, now: new Date('2026-11-24T19:00:00Z'), horizonDays: 14 })
  assert.ok(new URL(seen[0]).pathname.endsWith('/response_fields/' + RESPONSE_FIELDS.join(',')))
  assert.deepEqual(RESPONSE_FIELDS, ['location', 'group_title', 'event_types', 'summary', 'last_modified', 'registration', 'status'])
})

test('keeps upstream identity and freshness from the live-checked Choreographers\' Gallery row', () => {
  const r = calendar().find(x => x.providerId === '507179')
  assert.equal(r.groupId, '10')
  assert.equal(r.sourceUrl, 'https://events.scu.edu/arts-and-sciences/event/507179-choreographers-gallery-2026')
  assert.equal(r.lastModified, new Date(1790122500 * 1000).toISOString())
  assert.deepEqual(r.eventTypes, ['Open to the Public', 'Performances'])
  assert.equal(r.end, null)
  assert.equal(r.endEvidence, 'missing')
})

test("Choreographers' Gallery: three showtimes stay three, and none gets an end from iCal", () => {
  const shows = all().filter(c => c.calendar?.title === "Choreographers' Gallery 2026")
  assert.equal(shows.length, 3)
  assert.deepEqual(shows.map(c => c.providerId).sort(), ['507179', '907180', '907181'])
  for (const c of shows) {
    assert.equal(c.kind, 'showtime')
    assert.equal(status(c), 'held-no-verified-end')
    assert.deepEqual(c.refusedEvidence.map(e => e.reason), ['ical-default-duration'])
    assert.ok(c.fields.end.values.every(v => v.source !== 'ical-export'))
    // The ticket page's identical 11 p.m. end is shown to the reviewer as evidence, never accepted on its own.
    assert.equal(c.fields.end.state, 'unconfirmed')
    assert.deepEqual(c.fields.end.values.map(v => v.value), ['23:00'])
  }
  // One reviewer is not enough to accept the ticket page's end.
  const one = applyReviews(shows[0], [{ reviewer: 'r1', decisions: { end: { action: 'confirm' } } }])
  assert.equal(status(one), 'held-no-verified-end')
})

test('WAVE: a different newsletter title joins the calendar row only because its link names that event', () => {
  const rows = newsletter()
  const wave = rows.find(n => n.title === 'WAVE Founders Workshop')
  assert.equal(wave.linkedProviderId, '907210')
  const c = byProvider(all(), '907210')
  assert.equal(c.newsletters.length, 1)
  assert.deepEqual(c.aliases, ['WAVE Founders Workshop'])
  assert.equal(c.fields.title.values[0].value, 'Women in Venture (WAVE): Pitch Your Idea Workshop')
  assert.equal(c.fields.start.state, 'agreed')
  assert.equal(c.fields.contact.values[0].value, 'Priya Shah (pshah@scu.edu)')
  assert.ok(!c.flags.includes('ada-contact-missing'))
  assert.equal(status(c), 'needs-more-reviewers')
  assert.equal(status(applyReviews(c, [{ reviewer: 'r1', decisions: {} }])), 'needs-more-reviewers')
  assert.equal(status(applyReviews(c, twoReviewers({}))), 'ready')
})

test('Idea Lab: a similar title is only a suggestion; a reviewer-confirmed link turns all-day vs 10 to 3 into a dispute', () => {
  let cs = all()
  const fromNewsletter = loose(cs, 'Bronco Ventures Idea Lab')
  assert.deepEqual(fromNewsletter.possibleMatches, ['907200'])
  assert.ok(fromNewsletter.flags.includes('newsletter-only-possible-calendar-match'))
  assert.equal(byProvider(cs, '907200').newsletters.length, 0, 'never joined by title')
  cs = confirmLink(cs, fromNewsletter.key, '907200')
  const joined = byProvider(cs, '907200')
  assert.equal(joined.linkedBy, 'reviewer')
  assert.equal(joined.fields.start.state, 'disputed')
  assert.deepEqual(joined.fields.start.values.map(v => v.value), ['all day', '10:00'])
  assert.deepEqual(joined.fields.end.values.map(v => v.value), ['all day', '15:00'])
  assert.equal(status(joined), 'disputed')
  // The calendar value is still there: nothing was overwritten. Reviewers settle it with explicit values.
  const settled = applyReviews(joined, twoReviewers({ start: { action: 'edit', value: '10:00' }, end: { action: 'edit', value: '15:00' } }))
  // Bronco Ventures is a university program: departments skip the ADA/contact check.
  assert.equal(status(settled), 'ready')
  assert.equal(status(applyReviews(joined, twoReviewers({ start: { action: 'confirm' }, end: { action: 'confirm' } }))), 'disputed',
    'confirming a disputed field without choosing a value settles nothing')
})

test('AI Kitchen: the same email names two speakers, so speaker is a dispute with both passages', () => {
  const c = loose(all(), 'AI Kitchen')
  assert.equal(c.newsletters.length, 2)
  assert.equal(c.fields.speaker.state, 'disputed')
  assert.deepEqual(c.fields.speaker.values.map(v => v.value), ['Viral Parekh, Founder of Banavu', 'Adam Smith from OpenAI'])
  assert.ok(c.fields.speaker.values.every(v => typeof v.passage === 'string' && v.passage.length > 5))
  assert.equal(c.fields.start.state, 'agreed')
  assert.equal(status(c), 'disputed')
  const flagged = applyReviews(c, twoReviewers({ speaker: { action: 'edit', value: 'Viral Parekh, Founder of Banavu' } }))
  assert.equal(flagged.review.settled.speaker, 'Viral Parekh, Founder of Banavu')
  // Still newsletter-only: two mentions in one email do not verify the end without reviewers saying so.
  assert.equal(status(flagged), 'held-no-verified-end')
  const checked = applyReviews(c, twoReviewers({
    speaker: { action: 'edit', value: 'Viral Parekh, Founder of Banavu' },
    title: { action: 'confirm' }, date: { action: 'confirm' }, start: { action: 'confirm' }, end: { action: 'confirm' }, location: { action: 'confirm' },
  }))
  // Newsletter-only with no known host: SCU's ADA/504 statement is still required...
  assert.equal(status(checked), 'needs-ada-contact')
  // ...unless two reviewers record that a university department hosts it.
  const dept = applyReviews(c, twoReviewers({
    speaker: { action: 'edit', value: 'Viral Parekh, Founder of Banavu' },
    title: { action: 'confirm' }, date: { action: 'confirm' }, start: { action: 'confirm' }, end: { action: 'confirm' }, location: { action: 'confirm' },
  }, { hostKind: 'university-department' }))
  assert.equal(status(dept), 'ready')
})

test('Intandesh Diwali: a different Diwali event that day is never treated as the same event', () => {
  const cs = all()
  const c = loose(cs, 'Intandesh Diwali Celebration')
  assert.deepEqual(c.possibleMatches, ['907220'])
  assert.equal(byProvider(cs, '907220').newsletters.length, 0)
  assert.notEqual(status(c), 'ready')
})

test('Maryanne Wolf: a provost link joins exactly; the live feed (PR #92) already serves it under the same ID', () => {
  const c = byProvider(all(), '521456')
  assert.equal(c.newsletters.length, 1)
  assert.equal(c.fields.end.state, 'agreed')
  assert.equal(c.fields.speaker.values[0].value, 'Maryanne Wolf')
  assert.equal(c.hostKind, 'university-department')
  assert.equal(c.calendar.liveFeedEligible, true)
  assert.equal(c.calendar.sideQuestId, 'da2f880c-2a83-8d1a-8c04-00000007f4f0')
  assert.equal(status(c), 'served-by-live-feed')
  assert.equal(eligibleForFreeTime(c), true)
  // A reviewer correction means #86 publishes an update to that same ID rather than a second event.
  const corrected = applyReviews(c, twoReviewers({ location: { action: 'edit', value: 'Locatelli Center, main hall' } }))
  assert.equal(status(corrected), 'ready')
})

test('identity and eligibility match PR #92', () => {
  assert.equal(scuCalendarId('507179'), 'da2f880c-2a83-8d1a-8c04-00000007bd2b')
  assert.equal(scuCalendarId('281474976710656'), null, 'beyond 48 bits: #92 refuses it too')
  const base = { id: 600001, title: 'Fixture talk', url: 'https://events.scu.edu/event/600001-fixture', status: 1,
    date_ts: Date.parse('2026-11-30T20:00:00Z') / 1000, date2_ts: Date.parse('2026-11-30T21:00:00Z') / 1000,
    location: 'Fixture Hall', group_title: 'Fixture Office' }
  const row = changes => normalizeRow({ ...base, ...changes }, F.SOURCE, F.CHECKED_AT)
  assert.equal(row({}).liveFeedEligible, true)
  // #92 skips a row whose link names another event (a mirrored listing): #86 holds it.
  const mirrored = row({ url: 'https://events.scu.edu/event/600002-fixture' })
  assert.equal(mirrored.liveFeedEligible, false)
  assert.ok(mirrored.reasons.includes('mirrored-row'))
  for (const [changes, reason] of [[{ is_online: 1 }, 'online-only'], [{ status: 0 }, 'not-published-upstream'],
    [{ is_canceled: 1 }, 'canceled'], [{ date2_ts: null }, 'end-unavailable'], [{ is_all_day: 1 }, 'all-day']]) {
    const r = row(changes)
    assert.equal(r.liveFeedEligible, false, reason)
    assert.ok(r.reasons.includes(reason), reason)
  }
})

test('a deadline in the newsletter is a date to remember, never a Discover event', () => {
  const c = loose(all(), 'Program of Studies Deadline')
  assert.equal(status(c), 'not-an-event')
})

test('a reviewer flag holds the event even when the sources agree', () => {
  const c = byProvider(all(), '907210')
  const reviewed = applyReviews(c, [{ reviewer: 'r1', decisions: { location: { action: 'flag' } } }, { reviewer: 'r2', decisions: {} }])
  assert.equal(status(reviewed), 'flagged-missing')
})

test('metrics for the known-answer set', () => {
  assert.deepEqual(metrics(all()), {
    candidates: 12, scheduleReady: 0, servedByLiveFeed: 1, timeTba: 0, heldNoVerifiedEnd: 7, disputed: 1, reviewItems: 10,
    wouldMispublishIfNaive: 6, icalEndsRefused: 3,
  })
})

test('newsletter parsing: times, links and the ADA statement', () => {
  assert.deepEqual(parseTimeRange('1-3 p.m.'), { start: '13:00', end: '15:00', passage: '1-3 p.m.' })
  assert.deepEqual(parseTimeRange('10:00 a.m. to 3:00 p.m.').start, '10:00')
  assert.deepEqual(parseTimeRange('10:45 a.m.-12:15 p.m.').end, '12:15')
  assert.deepEqual(parseTimeRange('11-1 p.m.'), { start: '11:00', end: '13:00', passage: '11-1 p.m.' })
  assert.equal(parseTimeRange('8:00 p.m.').end, null, 'a lone start never gets an invented end')
  assert.equal(liveWhaleIdFromLink('https://events.scu.edu/provost/event/521456-maryanne-wolf'), '521456')
  assert.equal(liveWhaleIdFromLink('https://share.hsforms.com/19uTleRT'), null)
  assert.equal(liveWhaleIdFromLink('http://events.scu.edu/event/521456'), null)
  assert.deepEqual(accessFrom('In compliance with the ADA/504, please direct your accommodation requests to Sam Lee at (408) 554-4000.'),
    { statement: 'In compliance with the ADA/504, please direct your accommodation requests to Sam Lee at (408) 554-4000.', contact: 'Sam Lee ((408) 554-4000)' })
  assert.throws(() => parseEngineeringNewsletter('<p>x</p>', { code: 'x' }), /publish date/)
})

test('AI extraction is off by default and keeps only values it can point to in the source', async () => {
  const text = 'AI Kitchen this Friday, November 20, from 1-3 p.m. in the Benson CA Mission Room.'
  const off = await extractWithAi(text, { env: {}, callModel: async () => { throw new Error('must not be called') } })
  assert.equal(off.enabled, false)
  const { kept, dropped } = acceptAiEvents({ events: [{
    title: { value: 'AI Kitchen', evidence: { passage: 'AI Kitchen' } },
    date: { value: '2026-11-20', evidence: { passage: 'November 20' } },
    start: { value: '13:00', evidence: { passage: '1-3 p.m.' } },
    end: { value: '15:00' },
    speaker: { value: 'Adam Smith', evidence: { passage: 'with Adam Smith' } },
    location: { value: 'Benson CA Mission Room', evidence: { imageRef: 'flyer-1.png' } },
  }] }, text, ['flyer-1.png'], { code: 'f26w9' })
  assert.equal(kept.length, 1)
  assert.equal(kept[0].start, '13:00')
  assert.equal(kept[0].end, null)
  assert.equal(kept[0].location, 'Benson CA Mission Room')
  assert.equal(kept[0].speaker, null)
  assert.deepEqual(dropped.map(d => d.field + ':' + d.reason).sort(), ['end:no-evidence', 'speaker:evidence-not-in-source'])
})

const lead = name => parseInstagramLead(F.INSTAGRAM[name], F.ORGANIZERS)
const instagramCandidate = name => buildCandidates({ newsletter: [lead(name)] })[0]

test('Instagram: the organizer\'s own post with date, start, end, venue and the ADA statement is verified for Discover', () => {
  const r = lead('complete')
  assert.equal(r.postUrl, 'https://www.instagram.com/p/DxWinter01/')
  assert.equal(r.handle, 'scu.dance.collective')
  assert.equal(r.organizerPost, true)
  assert.deepEqual([r.title, r.date, r.start, r.end, r.location], ['Winter Showcase', '2026-12-04', '19:00', '21:00', 'Mission Room, Benson'])
  assert.equal(r.evidence.date, 'Fri, Dec 4')
  assert.equal(r.evidence.start, '7-9 p.m.')
  assert.equal(r.evidence.location, '📍 Mission Room, Benson')
  assert.equal(r.contact, 'Lena Ortiz (lortiz@scu.edu)')
  assert.deepEqual(r.imageRefs, ['winter-showcase-flyer.jpg'])
  const c = instagramCandidate('complete')
  assert.equal(c.hostKind, 'student-organization')
  assert.equal(c.fields.start.values[0].source, 'instagram:@scu.dance.collective')
  assert.equal(status(c), 'ready-organizer-verified')
  assert.deepEqual(browseListing(c), { date: '2026-12-04', start: '19:00', end: '21:00', label: null, freeTime: true })
})

test('Instagram: date known but no time stays in the organizer queue, excluded from Browse and free-time', () => {
  const c = instagramCandidate('noTime')
  assert.equal(c.fields.date.values[0].value, '2026-12-03')
  assert.equal(status(c), 'time-tba')
  assert.equal(eligibleForFreeTime(c), false)
  assert.equal(browseListing(c), null)
  const timed = confirmByOrganizer(c, { handle: 'scu.boba.society', values: { start: '18:00', end: '20:00' } })
  assert.equal(status(timed), 'needs-ada-contact', 'a student club still owes SCU\'s ADA/504 statement')
  const done = confirmByOrganizer(c, { handle: '@scu.boba.society', name: 'Mai Tran', contact: 'mtran@scu.edu', values: { start: '18:00', end: '20:00' } })
  assert.equal(done.fields.accessibility.values[0].value,
    'In compliance with the ADA/504, please direct your accommodation requests to Mai Tran at mtran@scu.edu.')
  assert.equal(status(done), 'ready-organizer-verified')
  assert.throws(() => confirmByOrganizer(c, { handle: 'scu.memes.daily', values: { start: '18:00' } }), /posting club/)
})

test('Instagram: "this Friday" is not a date, so the lead is held for the organizer', () => {
  const c = instagramCandidate('unclearDate')
  assert.equal(c.fields.date.state, 'missing')
  assert.equal(c.fields.start.values[0].value, '19:00')
  assert.equal(status(c), 'held-date-unclear')
  assert.equal(browseListing(c), null)
  const dated = confirmByOrganizer(c, { handle: 'scu.boardgames', values: { date: '2026-11-27' } })
  assert.equal(status(dated), 'time-tba', 'a start with no end is still not a full interval')
  const full = confirmByOrganizer(c, { handle: 'scu.boardgames', name: 'Jo Park', contact: 'jpark@scu.edu', values: { date: '2026-11-27', end: '22:00' } })
  assert.equal(status(full), 'ready-organizer-verified')
  // The organizer's time differs from the caption's: a dispute, not an overwrite.
  const clash = confirmByOrganizer(c, { handle: 'scu.boardgames', values: { date: '2026-11-27', start: '20:00', end: '22:00' } })
  assert.equal(status(clash), 'disputed')
})

test('Instagram: a full repost from a non-organizer account still needs the organizer, and nothing is fetched', () => {
  const c = instagramCandidate('repost')
  assert.equal(c.instagram.organizerPost, false)
  assert.equal(status(c), 'needs-organizer-confirmation')
  assert.equal(instagramPostUrl('https://www.instagram.com/p/DxWinter01/?igsh=abc'), 'https://www.instagram.com/p/DxWinter01/')
  assert.equal(instagramPostUrl('https://instagram.evil.com/p/DxWinter01/'), null)
  assert.throws(() => parseInstagramLead({ ...F.INSTAGRAM.complete, caption: '' }, F.ORGANIZERS), /caption/)
})

test('Instagram: invalid reviewed clock or reversed interval cannot become a public event', () => {
  const c = instagramCandidate('noTime')
  for (const values of [{ start:'25:00', end:'26:00' }, { start:'18:00', end:'17:00' }, { start:'18:00', end:'18:00' }]) {
    const confirmed = confirmByOrganizer(c, { handle:'scu.boba.society', name:'Fixture organizer', contact:'fixture@example.com', values })
    assert.equal(status(confirmed),'invalid-interval')
    assert.equal(browseListing(confirmed),null)
    assert.equal(eligibleForFreeTime(confirmed),false)
  }
})
