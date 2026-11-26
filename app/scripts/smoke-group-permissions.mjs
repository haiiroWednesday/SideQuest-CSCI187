// READ-ONLY staging security check: never creates, invites, responds or mutates.
// Default checks that unapproved group Auth remains OFF on an HTTPS preview.
// Explicit --approved-live requires three real staging identities and one
// pre-existing approved test plan; all tokens are read from process.env only.
// No bearer token, If note text, account ID, or full response is printed.
//
// node scripts/smoke-group-permissions.mjs https://your-staging.example
// node scripts/smoke-group-permissions.mjs https://your-staging.example --approved-live
//
// Approved mode environment (set in a protected shell, NEVER in Git):
// SIDEQUEST_STAGING_ORGANIZER_TOKEN / SIDEQUEST_STAGING_ORGANIZER_ID
// SIDEQUEST_STAGING_INVITEE_TOKEN / SIDEQUEST_STAGING_INVITEE_ID
// SIDEQUEST_STAGING_OUTSIDER_TOKEN / SIDEQUEST_STAGING_OUTSIDER_ID
// SIDEQUEST_STAGING_PLAN_ID

const [rawOrigin, ...flags] = process.argv.slice(2)
const approved = flags.length === 1 && flags[0] === '--approved-live'
const DEFAULT_ARGS = flags.length === 0
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function fail(message) { throw new Error(message) }
function assert(condition, message) { if (!condition) fail(message) }

if (!rawOrigin || (!DEFAULT_ARGS && !approved)) {
  console.error('Usage: node scripts/smoke-group-permissions.mjs <https-staging-origin> [--approved-live]')
  process.exit(2)
}

let origin
try {
  origin = new URL(rawOrigin)
  assert(origin.protocol === 'https:' && !origin.username && !origin.password &&
    origin.pathname === '/' && !origin.search && !origin.hash,
    'Supply only the HTTPS staging origin, without credentials, path or query.')
} catch {
  console.error('Supply a valid HTTPS staging origin without credentials, path or query.')
  process.exit(2)
}

function envSecret(name) {
  const secret = process.env[name]
  assert(typeof secret === 'string' && secret.length >= 20 && secret.length <= 8192,
    'Missing required protected staging token environment value: ' + name)
  return secret
}

function envUuid(name) {
  const value = process.env[name]
  assert(typeof value === 'string' && UUID.test(value),
    'Missing valid staging UUID environment value: ' + name)
  return value
}

async function request(path, token) {
  const url = new URL(path, origin.origin)
  const response = await fetch(url, {
    method: 'GET',
    redirect: 'error',
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
  })
  let data = null
  if (response.ok) {
    const body = await response.text()
    assert(body.length < 100_000, 'Staging response exceeds bounded check size.')
    try { data = JSON.parse(body) }
    catch { fail('Staging returned unreadable JSON.') }
  }
  return { status: response.status, data }
}

function assertPlan(plan, planId, organizerId, inviteeId, viewerId) {
  assert(plan && typeof plan === 'object' && !Array.isArray(plan) &&
    plan.id === planId && plan.organizerId === organizerId &&
    Array.isArray(plan.participants), 'Member response lacks the expected approved test plan.')
  const participant = plan.participants.find(x => x?.userId === inviteeId)
  assert(participant && typeof participant === 'object',
    'Approved test plan must include the test invitee.')
  for (const member of plan.participants) {
    assert(member && typeof member.userId === 'string',
      'Invalid group participant projection.')
    // If notes are shared with accepted members (team decision, Nov 24), but only an
    // If answer may carry note text.
    if (member.response !== 'if' && Object.prototype.hasOwnProperty.call(member, 'ifCondition')) {
      assert(member.ifCondition === null, 'A non-If answer carried If note text.')
    }
  }
  if (viewerId === inviteeId) {
    assert(Object.prototype.hasOwnProperty.call(participant, 'ifCondition'),
      'Invitee response lacks its caller-scoped condition projection.')
  }
}

try {
  const status = await request('/api/auth/status')
  assert(status.status === 200 && typeof status.data?.enabled === 'boolean',
    'Auth status endpoint did not respond correctly.')
  if (!approved) {
    assert(status.data.enabled === false,
      'UNEXPECTED: email Auth is enabled on an unapproved public preview.')
    const groups = await request('/api/groups')
    assert(groups.status === 503,
      'UNEXPECTED: private group endpoint is enabled in default-off mode.')
    console.log('PASS: HTTPS preview leaves email Auth and private group API disabled.')
    console.log('This checks feature flags only; live identity/RLS security remains unverified.')
  } else {
    assert(status.data.enabled === true, 'Approved live staging has no active Auth gateway.')
    const tokens = {
      organizer: envSecret('SIDEQUEST_STAGING_ORGANIZER_TOKEN'),
      invitee: envSecret('SIDEQUEST_STAGING_INVITEE_TOKEN'),
      outsider: envSecret('SIDEQUEST_STAGING_OUTSIDER_TOKEN'),
    }
    const ids = {
      organizer: envUuid('SIDEQUEST_STAGING_ORGANIZER_ID'),
      invitee: envUuid('SIDEQUEST_STAGING_INVITEE_ID'),
      outsider: envUuid('SIDEQUEST_STAGING_OUTSIDER_ID'),
    }
    const planId = envUuid('SIDEQUEST_STAGING_PLAN_ID')
    assert(new Set(Object.values(ids)).size === 3 && new Set(Object.values(tokens)).size === 3,
      'Approved staging roles must use three different accounts and tokens.')

    const withoutAuth = await request('/api/groups/' + planId)
    assert(withoutAuth.status === 401, 'Unauthenticated group detail read must be denied.')
    const wrongToken = await request('/api/groups/' + planId, 'definitely-invalid-test-token')
    assert(wrongToken.status === 401, 'Invalid bearer token must be denied.')

    const [organizer, invitee, outsider, listA, listB, listC] = await Promise.all([
      request('/api/groups/' + planId, tokens.organizer),
      request('/api/groups/' + planId, tokens.invitee),
      request('/api/groups/' + planId, tokens.outsider),
      request('/api/groups', tokens.organizer),
      request('/api/groups', tokens.invitee),
      request('/api/groups', tokens.outsider),
    ])
    assert(organizer.status === 200 && invitee.status === 200,
      'Organizer and invitee must read the approved plan.')
    assert(outsider.status === 404, 'Outsider must receive a non-disclosing 404.')
    assertPlan(organizer.data, planId, ids.organizer, ids.invitee, ids.organizer)
    assertPlan(invitee.data, planId, ids.organizer, ids.invitee, ids.invitee)
    assert(listA.status === 200 && listB.status === 200 && listC.status === 200 &&
      Array.isArray(listA.data) && Array.isArray(listB.data) && Array.isArray(listC.data),
      'Authorized group lists must return arrays.')
    assert(listA.data.some(x => x?.id === planId) &&
      listB.data.some(x => x?.id === planId) &&
      !listC.data.some(x => x?.id === planId),
      'Outsider list leaked the approved plan, or expected member plan is missing.')
    console.log('PASS: real staged Auth and group read boundary with three identities.')
    console.log('PASS: organizer/invitee reads, outsider 404, member lists, and If notes only on If answers.')
    console.log('READ-ONLY ONLY. Mutation permissions, session revocation, RLS and direct-table access require separate reviewed tests.')
  }
} catch (problem) {
  // Do not print HTTP bodies, tokens, participant details or credential values.
  const message = problem instanceof Error ? problem.message : 'Unknown failure'
  console.error('STAGING GROUP SECURITY CHECK FAILED: ' + message)
  process.exitCode = 1
}
