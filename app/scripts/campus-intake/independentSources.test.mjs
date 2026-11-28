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
