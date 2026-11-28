/**
 * Real-provider integration suite. Runs ONLY against a freshly provisioned,
 * loopback Supabase instance. No production credentials or browser traces.
 * Admin credentials provision synthetic users only; the actual app receives
 * just its anonymous/publishable key, and all assertions use caller JWTs.
 */
import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
import { createClient } from '@supabase/supabase-js'
import { chromium } from '@playwright/test'

if (process.env.SQ_DISPOSABLE_SUPABASE !== 'true') {
  throw Error('Refusing to run outside an explicitly disposable Supabase environment.')
}
function localOrigin(value) {
  const url = new URL(value)
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
      url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw Error('Integration tests require a plain loopback origin.')
  }
  return url.origin
}
const supabase = localOrigin(process.env.SQ_TEST_SUPABASE_URL)
const mail = localOrigin(process.env.SQ_TEST_MAIL_URL)
const anon = process.env.SQ_TEST_ANON_KEY
const adminKey = process.env.SQ_TEST_ADMIN_KEY
if (!anon || !adminKey || anon === adminKey) throw Error('Separate fixture keys required.')
const base = 'http://127.0.0.1:3317'
const runId = randomUUID().slice(0, 8)
const admin = createClient(supabase, adminKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})
// Prevent any test-only privileged value from reaching the actual Node app.
const server = spawn(process.execPath, ['dist-server/index.js'], {
  env: {
    PATH: process.env.PATH ?? '', HOME: process.env.HOME ?? '',
    NODE_ENV: 'production', PORT: '3317',
    SUPABASE_URL: supabase, SUPABASE_PUBLISHABLE_KEY: anon,
    SIDEQUEST_GROUPS_ENABLED: 'true', SIDEQUEST_AUTH_EMAIL_ENABLED: 'true',
    SIDEQUEST_AUTH_ALLOW_SIGNUP: 'false', SIDEQUEST_PUBLIC_GROUP_LOGIN: 'true',
    SIDEQUEST_AUTH_ALLOWED_DOMAINS: 'scu.edu', SIDEQUEST_PUBLIC_ORIGIN: base,
  },
  stdio: 'ignore',
})
let browser
let passed = 0
function pass(label) { passed++; console.log('PASS: ' + label) }
function check(value, message) { if (!value) throw Error(message) }
async function request(url, { token, key, body, method, origin } = {}) {
  return fetch(url, {
    method: method ?? (body === undefined ? 'GET' : 'POST'),
    redirect: 'error',
    headers: {
      ...(key ? { apikey: key } : {}),
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(origin ? { Origin: origin } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(20_000),
  })
}
const app = (path, token, body) => request(base + path, { token, body, origin: base })
const rpc = (name, token, body) => request(supabase + '/rest/v1/rpc/' + name, {
  key: anon, token: token ?? anon, body,
})
async function expectStatus(response, code, label) {
  if (response.status !== code) throw Error(label + ': expected ' + code + ', received ' + response.status)
  return response
}
async function json(response, code, label) {
  return (await expectStatus(response, code, label)).json()
}
async function denied(response, label) {
  if (![401, 403, 404].includes(response.status)) throw Error(label + ': expected access denial, received ' + response.status)
}
async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(base + '/api/auth/status', { signal: AbortSignal.timeout(1000) })).ok) return
    } catch { /* startup */ }
    if (server.exitCode !== null) throw Error('Built SideQuest server exited during startup.')
    await delay(500)
  }
  throw Error('Built SideQuest server did not start.')
}
async function provision(role) {
  const email = 'sq-' + role + '-' + runId + '@scu.edu'
  const { data, error } = await admin.auth.admin.createUser({
    email, password: randomUUID() + 'aA1!', email_confirm: true,
  })
  check(!error && data.user?.id, 'Could not provision disposable ' + role + ' account.')
  return { email, id: data.user.id }
}
async function readCode(email) {
  for (let i = 0; i < 40; i++) {
    const inbox = await json(await request(mail + '/api/v1/messages'), 200, 'Mailpit inbox')
    const match = inbox.messages?.find(m => m.To?.some(t => t.Address === email))
    if (match) {
      const message = await json(await request(mail + '/api/v1/message/' + encodeURIComponent(match.ID)), 200, 'Mailpit message')
      const code = (String(message.Text ?? '') + ' ' + String(message.HTML ?? '')).match(/SideQuest test code:\s*(\d{6,8})/)
      check(code, 'OTP email did not contain the configured code.')
      return code[1]
    }
    await delay(500)
  }
  throw Error('No local OTP email arrived.')
}
async function signIn(identity) {
  const context = await browser.newContext()
  const page = await context.newPage()
  console.log('Checking current login UI for a disposable account.')
  await page.goto(base + '/#login')
  await page.getByLabel('Santa Clara email', { exact: true }).fill(identity.email)
  await page.getByRole('button', { name: 'Email me a code', exact: true }).click()
  await page.getByLabel('Verification code', { exact: true }).waitFor()
  await page.getByLabel('Verification code', { exact: true }).fill(await readCode(identity.email))
  // This response is intercepted only in the test harness; never log its body.
  const verified = page.waitForResponse(r => new URL(r.url()).pathname === '/api/auth/verify-code')
  const groupRequest = page.waitForRequest(r => new URL(r.url()).pathname === '/api/groups' && r.method() === 'GET')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  const response = await verified
  check(response.status() === 200, 'Real OTP verification failed.')
  const session = await response.json()
  check(session.userId === identity.id && typeof session.accessToken === 'string', 'Auth returned the wrong identity.')
  const req = await groupRequest
  check((await req.allHeaders()).authorization === 'Bearer ' + session.accessToken, 'Browser failed to forward its own issued JWT.')
  await page.getByRole('heading', { name: 'Your group outings' }).waitFor()
  const persisted = await page.evaluate(token => [...Object.values(localStorage), ...Object.values(sessionStorage)].some(v => v.includes(token)), session.accessToken)
  check(!persisted, 'Session token was persisted in browser storage.')
  pass('Real email OTP and browser Authorization header for a distinct account')
  return { ...identity, token: session.accessToken, expiresAt: session.expiresAt, context, page }
}

try {
  await waitForServer()
  check((await json(await app('/api/auth/status'), 200, 'Auth status')).enabled === true, 'Auth feature disabled in isolated test.')
  const users = await Promise.all(['organizer', 'member', 'outsider'].map(provision))
  browser = await chromium.launch({ headless: true })
  const a = await signIn(users[0])
  const b = await signIn(users[1])
  const c = await signIn(users[2])
  const date = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  const event = await json(await app('/api/events', undefined, {
    title: 'Disposable integration event', hostName: 'SideQuest testing',
    description: 'Synthetic event for disposable integration tests only.',
    location: 'Fixture campus', date, start: '14:00', end: '15:00',
  }), 201, 'Public catalog write')
  const catalog = await json(await app('/api/events'), 200, 'Public catalog read')
  check(catalog.some(e => e.id === event.id), 'Real catalog did not persist the event.')
  pass('Public anonymous catalog still works against real Supabase')
  const plan = await json(await app('/api/groups', a.token, { eventId: event.id }), 201, 'Create group')
  const path = '/api/groups/' + plan.id
  const act = (user, revision, action, extra = {}) => app(path + '/actions', user.token, {
    expectedRevision: revision, action, ...extra,
  })
  const directRead = token => rpc('sidequest_group_read', token, { p_plan_id: plan.id })
  await denied(await app(path), 'Missing bearer')
  await denied(await app(path, c.token), 'Outsider read')
  await denied(await directRead(c.token), 'Outsider direct PostgREST read')
  await denied(await directRead(undefined), 'Anonymous direct RPC')
  const tampered = a.token.slice(0, -8) + 'AAAAAAAA'
  await denied(await app(path, tampered), 'Tampered JWT')
  await denied(await directRead(tampered), 'Tampered direct JWT')
  const list = await json(await app('/api/groups', c.token), 200, 'Outsider list')
  check(!list.some(p => p.id === plan.id), 'Outsider could enumerate a private plan.')
  for (const token of [undefined, a.token, b.token, c.token]) {
    for (const table of ['group_plans', 'group_participants', 'group_invitations']) {
      const url = supabase + '/rest/v1/' + table
      await denied(await request(url, { key: anon, token: token ?? anon }), 'Direct private table SELECT')
      const filter = table === 'group_plans' ? '?id=eq.' + plan.id : '?plan_id=eq.' + plan.id
      await denied(await request(url + filter, { key: anon, token: token ?? anon, method: 'DELETE' }), 'Direct private table DELETE')
      await denied(await request(url + filter, { key: anon, token: token ?? anon, method: 'PATCH',
        body: table === 'group_plans' ? { status: 'cancelled' } : table === 'group_participants'
          ? { response: 'works' } : { expires_at: '2099-01-01T00:00:00Z' } }), 'Direct private table UPDATE')
    }
  }
  pass('Signed JWTs, outsider isolation, anonymous RPC denial, direct-table denial')
  const invite = await json(await act(a, 0, 'invite', { inviteeId: b.id }), 200, 'Invite member')
  check(invite.participants.length === 0 && invite.invitations.includes(b.id), 'Invite implicitly created membership.')
  const missing = randomUUID()
  const blind = await json(await act(a, 1, 'invite', { inviteeId: missing }), 200, 'Invite unknown UUID')
  check(blind.participants.length === 0 && blind.invitations.includes(missing), 'Account existence changed invitation behavior.')
  await json(await act(a, 2, 'remove', { inviteeId: missing }), 200, 'Revoke unknown UUID')
  const pending = await json(await directRead(b.token), 200, 'Pending recipient direct read')
  check(pending.participants.length === 0 && pending.invitations.length === 1, 'Pending recipient saw another member.')
  await denied(await act(b, 3, 'respond', { response: 'works' }), 'Respond before acceptance')
  const accepted = await json(await act(b, 3, 'accept'), 200, 'Accept')
  check(accepted.participants[0]?.response === null, 'Acceptance implicitly consented to attendance.')
  pass('Invitation consent and account-enumeration resistance on real PostgREST')
  const note = '🦋'.repeat(280)
  const conditional = await json(await act(b, 4, 'respond', { response: 'if', condition: note }), 200, '280 code points')
  check(conditional.participants.find(m => m.userId === b.id)?.ifCondition === note, 'If note owner projection incorrect.')
  const organizer = await json(await app(path, a.token), 200, 'Organizer read')
  const directOrganizer = await json(await directRead(a.token), 200, 'Organizer direct RPC')
  for (const view of [organizer, directOrganizer]) {
    check(view.participants.find(m => m.userId === b.id)?.ifCondition === note, 'If note not shared with the organizer.')
  }
  await expectStatus(await act(b, 5, 'respond', { response: 'if', condition: '🦋'.repeat(281) }), 400, '281 code points')
  await expectStatus(await act(b, 4, 'respond', { response: 'works' }), 409, 'Stale revision')
  await expectStatus(await act(a, 5, 'confirm'), 400, 'Conditional is not consent')
  pass('Unicode boundary, shared If notes and stale revisions with real provider')
  await json(await act(a, 5, 'invite', { inviteeId: c.id }), 200, 'Invite third account')
  const declined = await json(await act(c, 6, 'decline'), 200, 'Decline')
  check(declined === null, 'Decline returned private plan details.')
  await denied(await directRead(c.token), 'Declined direct access')
  const noNote = await json(await act(b, 7, 'respond', { response: 'if' }), 200, 'If without note')
  check(noNote.participants.find(m => m.userId === b.id)?.ifCondition === null,
    'Optional note was not cleared.')
  await expectStatus(await act(a, 8, 'confirm'), 400, 'If without note remains tentative')
  await json(await act(b, 8, 'respond', { response: 'works' }), 200, 'Explicit Works')
  const confirmed = await json(await act(a, 9, 'confirm'), 200, 'Confirm')
  check(confirmed.status === 'confirmed', 'Plan failed to confirm.')
  pass('Decline removes access and confirmation requires explicit Works')
  const capacity = await json(await app('/api/groups', a.token, { eventId: event.id }), 201, 'Create capacity fixture')
  const capAction = (revision, action, extra = {}) => app('/api/groups/' + capacity.id + '/actions', a.token,
    { expectedRevision: revision, action, ...extra })
  // The agreed capacity is twelve people including the organizer.
  // Keep this independent of the implementation constants to catch regressions.
  const expectedInviteeLimit = 11
  for (let i = 0; i < expectedInviteeLimit; i++) {
    const updated = await json(await capAction(i, 'invite', { inviteeId: randomUUID() }), 200, 'Valid invitation slot')
    check(updated.invitations.length === i + 1 && updated.revision === i + 1, 'Invitation count or revision did not advance.')
  }
  await expectStatus(await capAction(expectedInviteeLimit, 'invite', { inviteeId: randomUUID() }), 400, '12th invitee (13th person)')
  const full = await json(await app('/api/groups/' + capacity.id, a.token), 200, 'Read full plan')
  check(full.invitations.length === expectedInviteeLimit && full.revision === expectedInviteeLimit, 'Rejected invitation changed the plan.')
  const cancelled = await json(await capAction(expectedInviteeLimit, 'cancel'), 200, 'Cancel capacity fixture')
  check(cancelled.status === 'cancelled' && cancelled.invitations.length === 0, 'Cancellation did not clear invitations.')
  pass('Twelve-person limit including organizer and cancellation enforced by real SQL')
  // Supabase logout revokes session/refresh credentials, but the old signed
  // access token can still be within its expiry. RPC session guard must deny.
  const revoked = b.page.waitForResponse(r =>
    new URL(r.url()).pathname === '/api/auth/sign-out' && r.request().method() === 'POST')
  await b.page.getByRole('button', { name: 'Sign out', exact: true }).click()
  const logout = await revoked
  check(logout.status() === 200 && (await logout.json()).revoked === true,
    'Application did not confirm provider logout.')
  await b.page.getByRole('status').filter({ hasText: 'Signed out of this session.' }).waitFor()
  await b.page.getByLabel('Santa Clara email', { exact: true }).waitFor()
  check(await b.page.getByRole('button', { name: 'Sign out', exact: true }).count() === 0,
    'Logged-out tab still offers a private session.')
  await expectStatus(await app(path, a.token), 200, 'Organizer remains signed in')
  await expectStatus(await app('/api/groups', c.token), 200, 'Unrelated session unaffected')
  await denied(await directRead(b.token), 'Logged-out token direct RPC')
  await denied(await app(path, b.token), 'Logged-out token app gateway')
  await denied(await rpc('sidequest_group_list', b.token, {}), 'Logged-out token direct list')
  pass('UI sign-out revokes the actual provider session and blocks its still-unexpired signed token')
  const deletion = await admin.auth.admin.deleteUser(b.id)
  check(!deletion.error, 'Disposable account deletion failed.')
  const after = await json(await app(path, a.token), 200, 'Plan after member deletion')
  check(after.status === 'cancelled' && after.revision === 11 && after.participants.length === 0,
    'Deleted participant did not invalidate confirmed plan and advance revision.')
  await denied(await directRead(b.token), 'Deleted account direct RPC')
  pass('Real Auth account deletion, FK cascade and confirmation invalidation')
  // Preserve the existing member-deletion case, then exercise organizer
  // deletion with a different plan that still has a live accepted member.
  const owned = await json(await app('/api/groups', a.token, { eventId: event.id }), 201, 'Create organizer-deletion fixture')
  const ownedPath = '/api/groups/' + owned.id
  const ownedAction = (user, revision, action, extra = {}) => app(ownedPath + '/actions', user.token,
    { expectedRevision: revision, action, ...extra })
  await json(await ownedAction(a, 0, 'invite', { inviteeId: c.id }), 200, 'Invite surviving member')
  await json(await ownedAction(c, 1, 'accept'), 200, 'Accept organizer-deletion fixture')
  const withPending = await json(await ownedAction(a, 2, 'invite', { inviteeId: randomUUID() }), 200, 'Leave pending invitation')
  check(withPending.participants.some(m => m.userId === c.id) && withPending.invitations.length === 1,
    'Organizer-deletion fixture must contain both membership and invitation.')
  await expectStatus(await app(ownedPath, c.token), 200, 'Accepted member read before organizer deletion')
  const removeOrganizer = await admin.auth.admin.deleteUser(a.id)
  check(!removeOrganizer.error, 'Disposable organizer deletion failed.')
  await denied(await directRead(a.token), 'Deleted organizer direct RPC')
  await denied(await app(ownedPath, c.token), 'Surviving member cannot read deleted plan')
  await denied(await rpc('sidequest_group_read', c.token, { p_plan_id: owned.id }), 'Surviving member direct RPC denied')
  const survivingList = await json(await app('/api/groups', c.token), 200, 'Surviving account remains usable')
  check(!survivingList.some(p => p.id === owned.id), 'Deleted organizer plan remains in surviving member list.')
  const survivingCatalog = await json(await app('/api/events'), 200, 'Public catalog after organizer deletion')
  check(survivingCatalog.some(e => e.id === event.id), 'Organizer deletion removed the public event.')
  pass('Organizer deletion removes group access without deleting other accounts or the event')
  // Use an actual issued access token, not a mocked expiry claim. The local
  // Auth configuration issues 180-second JWTs. Outsider C remains signed in;
  // list is accessible now, then both gateways must reject after its expiry.
  await expectStatus(await app('/api/groups', c.token), 200, 'Valid live session before natural expiry')
  const remaining = c.expiresAt - Date.now()
  check(remaining <= 185_000, 'Fixture Auth did not honor the short JWT lifetime.')
  console.log('Waiting for the disposable issued JWT to expire naturally.')
  await delay(Math.max(0, remaining) + 2000)
  await denied(await app('/api/groups', c.token), 'Naturally expired JWT via application')
  await denied(await rpc('sidequest_group_list', c.token, {}), 'Naturally expired JWT via direct PostgREST')
  pass('Actual issued access token expires and loses both application and RPC access')
  console.log('Completed ' + passed + ' real-stack acceptance checkpoints.')
} catch (error) {
  // Never print exception objects, response bodies, tokens, codes or traces.
  // Playwright failures may include sensitive field values in their messages.
  const message = error instanceof Error && error.message
    ? error.message.split('\n')[0].replace(/\b[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[redacted JWT]')
    : 'Unknown integration error'
  console.error('FAIL: ' + message)
  process.exitCode = 1
} finally {
  if (browser) await browser.close()
  server.kill('SIGTERM')
}
