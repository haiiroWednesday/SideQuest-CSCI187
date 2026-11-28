import assert from 'node:assert/strict'
import test from 'node:test'
import { collectPublicIcs } from './publicIcs.mjs'

const calendarId = 'test@group.calendar.google.com'
const source = { id:'test-calendar', adapter:'google-public-calendar', calendarId,
  calendarUrl:'https://calendar.google.com/calendar/embed?src=' + encodeURIComponent(calendarId) }
const base = ['UID:fixture@google.com','STATUS:CONFIRMED','SUMMARY:Workshop','DTSTART:20261202T200000Z']
const event = lines => ['BEGIN:VEVENT',...lines,'END:VEVENT'].join('\r\n')
const collect = entries => collectPublicIcs(source, { approvedRead:true, now:new Date('2026-11-28T00:00:00Z'),
  fetchImpl:async (url,opts) => {
    assert.match(url,/\/public\/basic\.ics$/)
    assert.equal(opts.redirect,'error')
    return new Response(['BEGIN:VCALENDAR','VERSION:2.0',...entries.map(event),'END:VCALENDAR'].join('\r\n'),
      {headers:{'Content-Type':'text/calendar'}})
  } })
test('one-off UTC event retains its UID across edits and never infers an end',async () => {
  const first = (await collect([base])).records[0]
  const next = (await collect([[...base.slice(0,-1),'DTSTART:20261202T210000Z','DTEND:20261202T220000Z']])).records[0]
  assert.equal(first.occurrenceKey,next.occurrenceKey)
  assert.equal(first.start,'12:00')
  assert.equal(first.end,null)
  assert.equal(next.end,'14:00')
  assert.equal(next.reviewState,'held')
  assert.equal(next.sourceUrl,source.calendarUrl)
})
test('repeated UIDs, series, private, floating and date-only events cannot become candidates',async () => {
  for (const entry of [['RRULE:FREQ=WEEKLY'],['CLASS:PRIVATE'],['STATUS:CANCELLED']]) {
    assert.equal((await collect([[...base,...entry]])).records.length,0)
  }
  for (const start of ['DTSTART;VALUE=DATE:20261202','DTSTART:20261202T100000']) {
    assert.equal((await collect([[...base.slice(0,-1),start]])).omitted.unverifiedStart,1)
  }
  assert.equal((await collect([base,[...base,'RECURRENCE-ID:20261202T200000Z']])).omitted.seriesOrRepeatedUid,2)
})
