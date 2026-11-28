import test from 'node:test'
import assert from 'node:assert/strict'
import { collectPublicGoogleCalendar } from './googlePublicCalendar.mjs'

const source={id:'scu-fixture-calendar',name:'Fixture calendar',adapter:'google-public-calendar',
  calendarId:'c_fixture@group.calendar.google.com',
  calendarUrl:'https://calendar.google.com/calendar/embed?src=c_fixture%40group.calendar.google.com'}
const now=new Date('2026-11-28T18:00:00Z')
const timed={id:'fixture_1',status:'confirmed',summary:'Fixture workshop',location:'Fixture room',
  start:{dateTime:'2026-12-01T10:00:00-08:00'},end:{dateTime:'2026-12-01T11:00:00-08:00'}}
const json=(payload,status=200)=>new Response(JSON.stringify(payload),{status,headers:{'Content-Type':'application/json'}})
const page=(items,nextPageToken)=>json({accessRole:'reader',items,nextPageToken})
const opts={approvedRead:true,apiKey:'fixture-key',now}

test('documented API pages expand instances, keep explicit ends and source link, exclude private and missing starts',async()=>{
  const calls=[]
  const result=await collectPublicGoogleCalendar(source,{...opts,fetchImpl:async(raw,request)=>{
    const url=new URL(raw)
    calls.push(url)
    assert.equal(url.origin,'https://www.googleapis.com')
    assert.equal(url.searchParams.get('singleEvents'),'true')
    assert.equal(url.searchParams.get('showDeleted'),'true')
    assert.equal(url.searchParams.get('key'),null)
    assert.equal(request.headers['X-Goog-Api-Key'],'fixture-key')
    assert.equal(request.redirect,'error')
    if(calls.length===1)return page([timed,{id:'all_day',status:'confirmed',start:{date:'2026-12-01'}},
      {...timed,id:'private',visibility:'private'},
      {...timed,id:'old',start:{dateTime:'2026-11-28T09:00:00-08:00'}}],'page2')
    assert.equal(url.searchParams.get('pageToken'),'page2')
    return page([{...timed,id:'fixture_2',recurringEventId:'series',endTimeUnspecified:true},
      {id:'cancelled_instance',status:'cancelled'}])
  }})
  assert.equal(result.pages,2)
  assert.equal(result.received,6)
  assert.equal(result.excludedMissingStart,1)
  assert.equal(result.excludedOther,2)
  assert.equal(result.complete,true)
  assert.deepEqual(result.cancellations,['cancelled_instance'])
  assert.deepEqual(result.records.map(r=>[r.providerId,r.start,r.end]),[['fixture_1','10:00','11:00'],['fixture_2','10:00',null]])
  assert.ok(result.records.every(r=>r.reviewState==='held'&&r.sourceUrl===source.calendarUrl))
})
test('unapproved, unregistered and missing-key requests never access network',async()=>{
  const fetchImpl=async()=>assert.fail('unexpected request')
  await assert.rejects(collectPublicGoogleCalendar(source,{now,fetchImpl}),/approval/)
  await assert.rejects(collectPublicGoogleCalendar({...source,calendarId:'primary'},{...opts,fetchImpl}),/Unknown/)
  await assert.rejects(collectPublicGoogleCalendar(source,{approvedRead:true,now,fetchImpl}),/key/)
  await assert.rejects(collectPublicGoogleCalendar({...source,calendarUrl:'https://example.org/'},{...opts,fetchImpl}),/registered/)
})
test('free-busy, provider failures and malformed payloads cannot produce successful empty snapshots',async()=>{
  for(const res of [json({accessRole:'freeBusyReader',items:[]}),json({error:'forbidden'},403),json({accessRole:'reader'})]){
    await assert.rejects(collectPublicGoogleCalendar(source,{...opts,fetchImpl:async()=>res}))
  }
})
test('later-page failure, repeated token and duplicate IDs fail the entire snapshot',async()=>{
  for(const responses of [[page([timed],'next'),json({},503)],[page([timed],'next'),page([],'next')],
    [page([timed],'next'),page([timed])]]){
    await assert.rejects(collectPublicGoogleCalendar(source,{...opts,fetchImpl:async()=>responses.shift()}))
  }
})
test('empty readable calendar is distinct from failure and creates no events',async()=>{
  const result=await collectPublicGoogleCalendar(source,{...opts,fetchImpl:async()=>page([])})
  assert.equal(result.complete,true)
  assert.deepEqual(result.records,[])
  assert.deepEqual(result.cancellations,[])
})
