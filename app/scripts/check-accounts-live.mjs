#!/usr/bin/env node
// Read-only check of a running SideQuest server's accounts setup. It signs nobody in, sends
// no email codes and writes nothing. Usage: npm run check:accounts -- http://localhost:3000
// It checks that sign-in and accounts are switched on, that /api/me refuses a missing or made-up
// token, and that the event catalog is shared. Your own sign-in is the final check, by hand.
const base = (process.argv[2] ?? 'http://localhost:3000').replace(/\/+$/, '')
let failed = 0
const check = (ok, label, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`)
  if (!ok) failed++
}
async function get(path, headers = {}) {
  try {
    const response = await fetch(base + path, { headers, cache: 'no-store' })
    let body = null
    try { body = await response.json() } catch { /* not JSON */ }
    return { status: response.status, body }
  } catch (error) {
    return { status: 0, body: { error: String(error?.message ?? error) } }
  }
}

console.log(`Checking ${base}\n`)
const status = await get('/api/auth/status')
check(status.status === 200, 'server answers /api/auth/status', `HTTP ${status.status}`)
check(status.body?.enabled === true, 'email sign-in is switched on', 'SIDEQUEST_AUTH_EMAIL_ENABLED=true')
check(status.body?.accounts === true, 'accounts are switched on', 'SIDEQUEST_ACCOUNTS_ENABLED=true')
const catalog = await get('/api/catalog')
check(catalog.body?.shared === true, 'event catalog is the shared Supabase one', 'SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY')
const none = await get('/api/me')
check(none.status === 401, '/api/me refuses a request with no token', `HTTP ${none.status}`)
const fake = await get('/api/me', { Authorization: 'Bearer made-up-token-that-is-not-a-session' })
check(fake.status === 401, '/api/me refuses a made-up token', `HTTP ${fake.status}`)
const html = await fetch(base + '/').then(r => r.text()).catch(() => '')
check(!/sb_publishable_|sb_secret_|service_role/.test(html), 'the page carries no database key')

console.log(failed ? `\n${failed} check(s) failed.` : '\nAll checks passed. Now sign in by hand on the Sign in page.')
process.exit(failed ? 1 : 0)
