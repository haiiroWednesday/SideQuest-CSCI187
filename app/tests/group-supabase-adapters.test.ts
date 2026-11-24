import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GroupGatewayError } from '../server/groupApi'
import { createSupabaseGroupGatewayFromEnv } from '../server/supabaseGroupAccess'
import { createSupabaseEmailOtpGatewayFromEnv } from '../server/supabaseEmailAuth'

const calls = vi.hoisted(() => ({
  createClient: vi.fn(),
  rpc: [] as Array<{ bearer: string | null; name: string; args: Record<string, unknown> }>,
  otpRequests: [] as Array<{ email: string; allowSignup: boolean }>,
}))

vi.mock('@supabase/supabase-js', () => ({ createClient: calls.createClient }))

const userA = '11111111-1111-4111-8111-111111111111'
const userB = '22222222-2222-4222-8222-222222222222'
const tokenA = 'A'.repeat(40)
const tokenB = 'B'.repeat(40)
const eventId = '33333333-3333-4333-8333-333333333333'
const planId = '44444444-4444-4444-8444-444444444444'
const env = {
  SIDEQUEST_GROUPS_ENABLED: 'true',
  SIDEQUEST_AUTH_EMAIL_ENABLED: 'true',
  SIDEQUEST_AUTH_ALLOW_SIGNUP: 'false',
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_fixture',
}

beforeEach(() => {
  calls.createClient.mockReset()
  calls.rpc.length = 0
  calls.otpRequests.length = 0
  calls.createClient.mockImplementation((_url: unknown, _key: unknown, options: {
    global?: { headers?: { Authorization?: string } },
  }) => {
    const bearer = options?.global?.headers?.Authorization ?? null
    return {
      auth: {
        async getUser(token: string) {
          if (token === 'outage') return { data: { user: null }, error: { status: 503 } }
          if (token === 'anonymous') return { data: { user: { id: userA, is_anonymous: true } }, error: null }
          const id = token === tokenA ? userA : token === tokenB ? userB : null
          return { data: { user: id ? { id } : null }, error: id ? null : { message: 'Invalid token', status: 401 } }
        },
        async signInWithOtp(input: { email: string; options: { shouldCreateUser: boolean } }) {
          calls.otpRequests.push({ email: input.email, allowSignup: input.options.shouldCreateUser })
          return { error: null }
        },
        async verifyOtp(input: { email: string; token: string; type: string }) {
          if (input.email !== 'student@example.edu' || input.token !== '123456' || input.type !== 'email') {
            return { data: { user: null, session: null }, error: { message: 'Invalid OTP' } }
          }
          return {
            data: {
              user: { id: userA },
              session: { access_token: tokenA, expires_at: Math.floor(Date.now() / 1000) + 3600 },
            },
            error: null,
          }
        },
      },
      async rpc(name: string, args: Record<string, unknown>) {
        calls.rpc.push({ bearer, name, args })
        if (args.p_expected_revision === 998) return { data: null, error: { code: 'PGRST301' }, status: 401 }
        if (args.p_expected_revision === 997) return { data: null, error: { code: '23503' }, status: 409 }
        if (args.p_expected_revision === 999) return { data: null, error: { code: '40001' } }
        if (name === 'sidequest_group_read' && bearer === `Bearer ${tokenB}`) {
          return { data: null, error: { code: '42501' } }
        }
        return { data: { ok: true, name }, error: null }
      },
    }
  })
})

describe('server-only Supabase Auth and group adapters', () => {
  it('keeps all gateways off without explicit server feature flags or a safe key', () => {
    expect(createSupabaseGroupGatewayFromEnv({})).toBeNull()
    expect(createSupabaseEmailOtpGatewayFromEnv({ ...env, SIDEQUEST_GROUPS_ENABLED: 'false' })).toBeNull()
    expect(() => createSupabaseGroupGatewayFromEnv({
      ...env, SUPABASE_PUBLISHABLE_KEY: 'sb_secret_forbidden',
    })).toThrow(/publishable/)
    expect(calls.createClient).not.toHaveBeenCalled()
  })

  it('verifies identity with Supabase Auth and scopes every RPC to its own bearer', async () => {
    const gateway = createSupabaseGroupGatewayFromEnv(env)
    expect(gateway).not.toBeNull()
    expect(await gateway!.verify(tokenA)).toEqual({ userId: userA })
    expect(await gateway!.verify(tokenB)).toEqual({ userId: userB })
    expect(await gateway!.verify('invalid')).toBeNull()
    expect(await gateway!.verify('anonymous')).toBeNull()
    await expect(gateway!.verify('outage')).rejects.toMatchObject({ status: 503 })

    await gateway!.list(tokenA)
    await gateway!.create(tokenA, eventId)
    await gateway!.read(tokenB, planId).catch(() => undefined)
    await gateway!.action(tokenB, planId, { expectedRevision: 2, action: 'respond', response: 'works' })

    expect(calls.rpc).toEqual([
      { bearer: `Bearer ${tokenA}`, name: 'sidequest_group_list', args: {} },
      { bearer: `Bearer ${tokenA}`, name: 'sidequest_group_create', args: { p_event_id: eventId } },
      { bearer: `Bearer ${tokenB}`, name: 'sidequest_group_read', args: { p_plan_id: planId } },
      { bearer: `Bearer ${tokenB}`, name: 'sidequest_group_action', args: {
        p_plan_id: planId, p_expected_revision: 2, p_action: 'respond', p_invitee_id: null,
        p_response: 'works', p_condition: null,
      } },
    ])
  })

  it('maps database permission failures and revision conflicts to safe HTTP statuses', async () => {
    const gateway = createSupabaseGroupGatewayFromEnv(env)!
    await expect(gateway.read(tokenB, planId)).rejects.toMatchObject({
      status: 404, message: 'The group request could not be completed.',
    } satisfies Partial<GroupGatewayError>)
    await expect(gateway.action(tokenA, planId, {
      action: 'confirm', expectedRevision: 999,
    })).rejects.toMatchObject({ status: 409 })
    await expect(gateway.action(tokenA, planId, { action: 'confirm', expectedRevision: 998 })).rejects.toMatchObject({ status: 401 })
    await expect(gateway.action(tokenA, planId, { action: 'invite', expectedRevision: 997, inviteeId: userB })).rejects.toMatchObject({ status: 400 })
  })

  it('issues and verifies an email code without signup or persisted sessions', async () => {
    const gateway = createSupabaseEmailOtpGatewayFromEnv(env)
    expect(gateway).not.toBeNull()
    await gateway!.requestCode('student@example.edu')
    expect(calls.otpRequests).toEqual([{ email: 'student@example.edu', allowSignup: false }])
    expect(await gateway!.verifyCode('student@example.edu', 'wrong')).toBeNull()
    const verified = await gateway!.verifyCode('student@example.edu', '123456')
    expect(verified?.userId).toBe(userA)
    expect(verified?.accessToken).toBe(tokenA)
    expect(verified?.expiresAt).toBeGreaterThan(Date.now())
    expect(calls.createClient.mock.calls.every((row: unknown[]) => {
      const config = row[2] as { auth?: { persistSession?: boolean } }
      return config.auth?.persistSession === false
    })).toBe(true)
  })
})
