import assert from 'node:assert/strict'
import test from 'node:test'
import { collectEngineeringNewsletters, collectOrganizerFeed, discoverNewsletterIssues } from './independentSources.mjs'
import { parseTimeRange } from './newsletter.mjs'

const now = new Date('2026-11-27T18:00:00Z')
const path = '/email/engineering/graduate-programs/weekly-newsletters/'
const index = '<a href="' + path + 'f26w8/">Week 8</a><a href="' + path + 'f26w7/">Week 7</a><a href="https://example.org' + path + 'f26w10/">Wrong origin</a>'
const html = '<h3>Upcoming Student Events</h3><table><tr><td>Dec</td><td>1</td></tr></table><p>Workshop</p><p>1:00-3:00 p.m., Benson CA Mission Room</p><table><tr><td>Dec</td><td>2</td></tr></table><p>No start</p><p>Time TBA</p><table><tr><td>Dec</td><td>3</td></tr></table><p>No end</p><p>8:00 p.m., Theatre</p>'
const response = (body, mime = 'text/html') => new Response(body, {headers: {'content-type': mime}})
test('discover only linked school issue URLs in most-recent order', () => {
  assert.deepEqual(discoverNewsletterIssues(index).map(i => i.code), ['f26w8','f26w7'])
})
test('newsletter fetches without manual entries; absent start excluded, missing end retained only for review', async () => {
  const calls = []
  const result = await collectEngineeringNewsletters({approvedRead:true, now, fetchImpl:async (url, opts) => {
    calls.push(url); assert.equal(opts.redirect,'error')
    return response(calls.length === 1 ? index : html)
  }})
  assert.equal(calls.length,3)
  assert.equal(result.complete,true)
  assert.equal(result.records.length,4)
  assert.deepEqual(result.records[0].location,'Benson CA Mission Room')
  assert.equal(result.records[0].start,'13:00')
  assert.equal(result.records[1].end,null)
  assert.ok(result.records.every(r => r.reviewState === 'awaiting-review'))
})
test('a failed issue is reported and never interpreted as an empty successful snapshot', async () => {
  let calls = 0
  const result = await collectEngineeringNewsletters({approvedRead:true, now, fetchImpl:async () => {
    calls++
    return calls === 1 ? response(index) : calls === 2 ? new Response('',{status:503}) : response(html)
  }})
  assert.equal(result.complete,false)
  assert.equal(result.failures.length,1)
  assert.equal(result.records.length,2)
})
test('invalid newsletter clocks never become valid times', () => {
  assert.equal(parseTimeRange('13:00 p.m.'),null)
  assert.equal(parseTimeRange('3:99 p.m.'),null)
})
const source = {id:'qlusion',page:'https://www.qlusion.com/'}
const row = {occurrenceId:'fixture-1',title:'Synthetic club meeting',organizer:'Fixture club',
  location:'Room',sourceUrl:'https://www.qlusion.com/events/fixture-1',
  startsAt:'2026-12-01T13:00:00-08:00',endsAt:'2026-12-01T14:00:00-08:00',status:'scheduled',audience:'scu-students'}
test('approved compatible Qlusion feed retains genuine source identity and ignores no-start rows', async () => {
  const result = await collectOrganizerFeed(source,'https://www.qlusion.com/approved-fixture.json',{
    approvedRead:true,now,fetchImpl:async()=>response(JSON.stringify({version:1,provider:'qlusion',
      events:[row,{...row,occurrenceId:'fixture-2',startsAt:null},{...row,occurrenceId:'fixture-3',endsAt:null}]}),'application/json')})
  assert.equal(result.records.length,2)
  assert.equal(result.excludedMissingStart,1)
  assert.equal(result.records[0].providerId,'fixture-1')
  assert.equal(result.records[1].reviewState,'held')
  assert.equal(result.complete,false)
})
test('unapproved and wrong-origin reads fail before networking', async () => {
  const fetchImpl=async()=>{assert.fail('network must not be called')}
  await assert.rejects(collectEngineeringNewsletters({fetchImpl}),/approval/)
  await assert.rejects(collectOrganizerFeed(source,'https://www.qlusion.com/a',{fetchImpl}),/approval/)
  await assert.rejects(collectOrganizerFeed(source,'https://example.org/a',{approvedRead:true,fetchImpl}),/Unsafe/)
  await assert.rejects(collectOrganizerFeed(source,'https://www.qlusion.com/a?token=secret',{approvedRead:true,fetchImpl}),/Unsafe/)
})

test('real newsletter clock styles and ambiguous afternoon', () => {
  assert.deepEqual(parseTimeRange('Market Street, 11 AM-1 PM'),{start:'11:00',end:'13:00',passage:'11 AM-1 PM'})
  assert.deepEqual(parseTimeRange('noon - 1 p.m.'),{start:'12:00',end:'13:00',passage:'noon - 1 p.m.'})
  assert.deepEqual(parseTimeRange('December 3-4, 1-3 p.m.'),{start:'13:00',end:'15:00',passage:'1-3 p.m.'})
  assert.equal(parseTimeRange('This afternoon'),null)
  assert.equal(parseTimeRange('Time TBA'),null)
})

// Minimal Week 8 ticket card structure observed in the published HTML.
test('reads nested newsletter cards and confines links to their own event', async () => {
  const card = (day,title,summary,link) => `<table class="cal-table"><tr><td><table><tr><td><div class="cal-date-month">Dec</div></td></tr>
    <tr><td><div class="cal-date-day">${day}</div></td></tr></table></td><td class="cal-event-block">
    <div class="cal-event-title">${title}</div><div class="cal-event-summary">${summary}</div>
    <div class="cal-event-link">${link}</div></td></tr></table>`
  const issue = '<h3><strong>Upcoming Student Events</strong></h3>' +
    card(1,'SCU Night w/ Golden State Warriors','8:00 p.m., Chase Center','') +
    card(2,'Unscheduled','Time TBA','') + '<a href="https://events.scu.edu/event/123-footer">Footer</a>'
  let first = true
  const result = await collectEngineeringNewsletters({approvedRead:true,now,fetchImpl:async () => {
    if (!first) return response(issue)
    first = false
    return response('<a href="' + path + 'f26w8/">Issue</a>')
  }})
  assert.equal(result.records.length,1)
  const [record] = result.records
  assert.deepEqual([record.start,record.end,record.location,record.linkedProviderId],['20:00',null,'Chase Center',null])
  assert.deepEqual(record.links,[])
})

test('ticket evidence keeps showtimes separate and omits date-only starts',async () => {
  const { collectScuPresents } = await import('./scuPresents.mjs')
  const links = ['early','late','tba']
  const result = await collectScuPresents({approvedRead:true,now,fetchImpl:async url => {
    if (url.includes('/section/')) return response(links.map(id => '<a class="other-event-box-link" href="/event/' + id + '">Gallery</a>').join(''))
    const startDate = url.endsWith('tba') ? '2026-12-05' : url.endsWith('late') ? '2026-12-05T05:00:00Z' : '2026-12-05T03:00:00Z'
    const data = {'@type':'Event',url,name:'Gallery',startDate,eventStatus:'https://schema.org/EventScheduled',
      eventAttendanceMode:'https://schema.org/OfflineEventAttendanceMode'}
    return response('<script type="application/ld+json">' + JSON.stringify(data) + '</script>')
  }})
  assert.equal(result.complete,true)
  assert.equal(result.excludedMissingStart,1)
  assert.deepEqual(result.records.map(r=>[r.date,r.start,r.end,r.reviewState]),[
    ['2026-12-04','19:00',null,'held'],['2026-12-04','21:00',null,'held']])
  assert.notEqual(result.records[0].sourceUrl,result.records[1].sourceUrl)
})

test('a disabled origin and invalid configuration have separate failure receipts', async () => {
  const { spawnSync } = await import('node:child_process')
  const { mkdtemp, readFile, rm } = await import('node:fs/promises')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const { fileURLToPath } = await import('node:url')
  const directory = await mkdtemp(join(tmpdir(), 'sidequest-intake-'))
  try {
    const output = join(directory, 'receipt.json')
    const script = fileURLToPath(new URL('../refresh-independent-events.mjs', import.meta.url))
    const config = { qlusion: { approved: true, url: 'https://www.qlusion.com/' },
      unknown: {}, 'scu-ecp-clubs-calendar': { approved: true } }
    const result = spawnSync(process.execPath, [script, '--approved-read', '--output', output], {
      env: { ...process.env, SIDEQUEST_INDEPENDENT_FEEDS: JSON.stringify(config), SIDEQUEST_GOOGLE_PUBLIC_CALENDAR_API_KEY: '' },
      timeout: 5000,
    })
    assert.equal(result.status, 1)
    const receipt = JSON.parse(await readFile(output, 'utf8'))
    assert.deepEqual(receipt.results.map(r => [r.id, r.status, r.reason]), [
      ['qlusion', 'failed', 'invalid-or-unapproved-source'], ['unknown', 'failed', 'invalid-or-unapproved-source'],
      ['scu-ecp-clubs-calendar', 'failed', undefined],
    ])
    assert.equal(receipt.published, 0)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})


test('malformed intervals and unrelated deadlines never supply an event start', () => {
  for (const text of [
    '1:0-2 p.m.', '1:000-2 p.m.', '1: - 2 p.m.',
    'Register by 5 p.m.', 'Time TBA; registration closes 5 p.m.',
    'Doors open at 6 p.m.', '6 p.m. or 7 p.m.',
    'Show starts at 7 p.m. or 8 p.m.',
  ]) assert.equal(parseTimeRange(text), null, text)
  assert.deepEqual(parseTimeRange('Doors open at 6 p.m.; show starts at 7 p.m.'),
    {start:'19:00', end:null, passage:'7 p.m.'})
})

test('independent newsletter collection excludes false starts but retains explicitly labelled starts for review', async () => {
  const card = (day, title, info) => '<table><tr><td>Dec</td><td>' + day +
    '</td></tr></table><p>' + title + '</p><p>' + info + '</p>'
  const issue = '<h3>Upcoming Student Events</h3>' +
    card(1, 'Malformed interval', '1:0-2 p.m.') +
    card(2, 'Unscheduled workshop', 'Time TBA; registration closes 5 p.m.') +
    card(3, 'Door time only', 'Doors open at 6 p.m.') +
    card(4, 'Performance', 'Doors open at 6 p.m.; show starts at 7 p.m.') +
    card(5, 'Workshop', '1:00-3:00 p.m., Benson')
  let first = true
  const result = await collectEngineeringNewsletters({approvedRead:true, now, fetchImpl:async () => {
    if (!first) return response(issue)
    first = false
    return response('<a href="' + path + 'f26w8/">Issue</a>')
  }})
  assert.equal(result.complete, true)
  assert.deepEqual(result.records.map(r => [r.title, r.start, r.end, r.reviewState]), [
    ['Performance', '19:00', null, 'awaiting-review'],
    ['Workshop', '13:00', '15:00', 'awaiting-review'],
  ])
})
