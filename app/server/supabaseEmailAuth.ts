// SERVER-ONLY Supabase Auth email-code adapter. A separate Supabase client is
// constructed for every request to prevent per-user session cross-contamination.
// Only the existing publishable key is allowed. No service role or privileged key.
import { createClient } from '@supabase/supabase-js'
import { createSupabaseEventCatalogFromEnv } from '../src/model/supabaseEventTable'
import { EmailSendError, type EmailOtpGateway } from './emailAuthApi'

/** The exp claim of a token Supabase Auth has just accepted, in milliseconds. */
export function tokenExpiry(accessToken: string): number | null {
  try {
    const payload = JSON.parse(Buffer.from(accessToken.split('.')[1] ?? '', 'base64url').toString('utf8')) as { exp?: unknown }
    return typeof payload.exp === 'number' && Number.isFinite(payload.exp) ? payload.exp * 1000 : null
  } catch { return null }
}

export function createSupabaseEmailOtpGatewayFromEnv(
  env: Readonly<Record<string, unknown>> = {},
): EmailOtpGateway | null {
  // Email sign-in serves group planning (PR #84) or personal accounts; either must be switched on.
  if (env.SIDEQUEST_AUTH_EMAIL_ENABLED !== 'true' ||
      (env.SIDEQUEST_GROUPS_ENABLED !== 'true' && env.SIDEQUEST_ACCOUNTS_ENABLED !== 'true')) {
    return null
  }
  // Reuse M2 server-side config validation; never accept secret/service-role keys.
  if (!createSupabaseEventCatalogFromEnv(env)) return null
  const url = String(env.SUPABASE_URL).trim()
  const key = String(env.SUPABASE_PUBLISHABLE_KEY).trim()
  const allowSignup = env.SIDEQUEST_AUTH_ALLOW_SIGNUP === 'true'
  const newClient = () => createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: (input, init) => fetch(input, {
        ...init,
        signal: AbortSignal.any([
          ...(init?.signal ? [init.signal] : []),
          AbortSignal.timeout(10_000),
        ]),
      }),
    },
  })

  return {
    async requestCode(email, redirectTo) {
      const client = newClient()
      const { error } = await client.auth.signInWithOtp({
        email, options: { shouldCreateUser: allowSignup, ...(redirectTo ? { emailRedirectTo: redirectTo } : {}) },
      })
      if (error) {
        // 429: Supabase's hourly email limit. 5xx: its mail service is down. Neither reveals
        // whether the address has an account, so the student is told and can try later.
        if (error.status === 429 || error.code === 'over_email_send_rate_limit') throw new EmailSendError('limit')
        if (typeof error.status === 'number' && error.status >= 500) throw new EmailSendError('outage')
        throw Error('Code request was not accepted.')
      }
    },
    async verifyCode(email, code) {
      const client = newClient()
      const { data, error } = await client.auth.verifyOtp({
        email, token: code, type: 'email',
      })
      const accessToken = data.session?.access_token
      if (error || !accessToken || !data.user?.id) return null
      // A trusted Auth server must confirm the identity for the issued token.
      const userResult = await client.auth.getUser(accessToken)
      if (userResult.error || userResult.data.user?.id !== data.user.id) return null
      const expiresAt = (data.session?.expires_at ?? 0) * 1000
      if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null
      return { userId: data.user.id, email: userResult.data.user?.email ?? undefined, accessToken, expiresAt }
    },
    async sessionFromLink(accessToken) {
      // Supabase Auth is the judge: an expired, revoked or forged token gets no user.
      const { data, error } = await newClient().auth.getUser(accessToken)
      if (error || !data.user?.id) return null
      const expiresAt = tokenExpiry(accessToken)
      if (!expiresAt || expiresAt <= Date.now()) return null
      return { userId: data.user.id, email: data.user.email ?? undefined, accessToken, expiresAt }
    },
  }
}
