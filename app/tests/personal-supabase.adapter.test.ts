// The Supabase adapter for /api/me runs every query as the signed-in student: it forwards that
// student's own token and only ever the publishable key, and it never sends a user ID itself.
import { describe, expect, it } from 'vitest'
import { accountsEnabled, createSupabasePersonalGatewayFromEnv } from '../server/personalSupabase'
import { PersonalStoreError } from '../src/model/personalData'

const KEY = 'sb_publishable_example_key_for_tests_only'
const env = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_PUBLISHABLE_KEY: KEY, SIDEQUEST_ACCOUNTS_ENABLED: 'true', SIDEQUEST_AUTH_EMAIL_ENABLED: 'true' }
const TOKEN = 'student-access-token-for-adapter-tests'
const USER = '11111111-1111-4111-8111-111111111111'

type Seen = { url: string; method: string; headers: Headers; body: string | null }
function fakeFetch(reply: (seen: Seen) => { status: number; body: unknown }) {
  const seen: Seen[] = []
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init)
    const entry = { url: request.url, method: request.method, headers: request.headers, body: init?.body ? String(init.body) : null }
    seen.push(entry)
    const { status, body } = reply(entry)
    return new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
  }) as typeof fetch
  return { impl, seen }
}

describe('personal Supabase adapter', () => {
  it('stays off unless both accounts and email sign-in are switched on', () => {
    expect(accountsEnabled(env)).toBe(true)
    expect(createSupabasePersonalGatewayFromEnv({ ...env, SIDEQUEST_ACCOUNTS_ENABLED: 'false' })).toBeNull()
    expect(createSupabasePersonalGatewayFromEnv({ ...env, SIDEQUEST_AUTH_EMAIL_ENABLED: 'false' })).toBeNull()
    expect(createSupabasePersonalGatewayFromEnv({ ...env, SUPABASE_URL: '' })).toBeNull()
  })
  it('refuses a privileged key', () => {
    expect(() => createSupabasePersonalGatewayFromEnv({ ...env, SUPABASE_PUBLISHABLE_KEY: 'sb_secret_should_never_be_here' })).toThrow()
  })
  it('checks the session with Supabase Auth using the student\'s token', async () => {
    const { impl, seen } = fakeFetch(({ url }) => url.includes('/auth/v1/user') ? { status: 200, body: { id: USER, aud: 'authenticated' } } : { status: 404, body: {} })
    const gateway = createSupabasePersonalGatewayFromEnv(env, impl)!
    expect(await gateway.userFor(TOKEN)).toBe(USER)
    expect(seen[0].headers.get('authorization')).toBe(`Bearer ${TOKEN}`)
    const expired = fakeFetch(() => ({ status: 401, body: { message: 'expired' } }))
    expect(await createSupabasePersonalGatewayFromEnv(env, expired.impl)!.userFor(TOKEN)).toBeNull()
  })
  it('sends every table query with the student\'s token and the publishable key, and never a user ID', async () => {
    const { impl, seen } = fakeFetch(({ url, method }) => {
      if (url.includes('/rest/v1/my_plans') && method === 'GET') return { status: 200, body: [{ event_id: 'e1' }] }
      if (url.includes('/rest/v1/my_plans') && method === 'POST') return { status: 201, body: [] }
      if (url.includes('/rest/v1/busy_times') && method === 'POST') return { status: 201, body: { id: 'b1', busy_date: '2026-11-25', start_time: '09:00:00', end_time: '10:30:00', source: 'typed' } }
      return { status: 200, body: [] }
    })
    const store = createSupabasePersonalGatewayFromEnv(env, impl)!.storeFor(TOKEN, USER)
    expect(await store.listPlans()).toEqual(['e1'])
    await store.addPlan('00000000-0000-4000-8000-000000000001')
    expect(await store.addBusy({ date: '2026-11-25', start: '09:00', end: '10:30', source: 'typed' }))
      .toEqual({ id: 'b1', date: '2026-11-25', start: '09:00', end: '10:30', source: 'typed' })
    expect(seen.length).toBeGreaterThanOrEqual(3)
    for (const request of seen) {
      expect(request.headers.get('authorization')).toBe(`Bearer ${TOKEN}`)
      expect(request.headers.get('apikey')).toBe(KEY)
      expect(request.body ?? '').not.toContain('user_id')
    }
  })
  it('treats a plan saved twice as done, and the database\'s refusal at the cap as the limit', async () => {
    const duplicate = fakeFetch(() => ({ status: 409, body: { code: '23505', message: 'duplicate key' } }))
    await expect(createSupabasePersonalGatewayFromEnv(env, duplicate.impl)!.storeFor(TOKEN, USER).addPlan('00000000-0000-4000-8000-000000000001')).resolves.toBeUndefined()
    const full = fakeFetch(() => ({ status: 403, body: { code: '42501', message: 'new row violates row-level security policy' } }))
    const refused = createSupabasePersonalGatewayFromEnv(env, full.impl)!.storeFor(TOKEN, USER).addPlan('00000000-0000-4000-8000-000000000001')
    await expect(refused).rejects.toBeInstanceOf(PersonalStoreError)
    await expect(refused).rejects.toMatchObject({ kind: 'limit' })
  })
  it('reports an idea that RLS hides as not found', async () => {
    const hidden = fakeFetch(() => ({ status: 200, body: [] }))
    const store = createSupabasePersonalGatewayFromEnv(env, hidden.impl)!.storeFor(TOKEN, USER)
    await expect(store.removeIdea('00000000-0000-4000-8000-000000000009')).rejects.toMatchObject({ kind: 'not-found' })
  })
})
