// SERVER-ONLY Supabase Auth email-code adapter. A separate Supabase client is
// constructed for every request to prevent per-user session cross-contamination.
// Only the existing publishable key is allowed. No service role or privileged key.
import { createClient } from '@supabase/supabase-js'
import { createSupabaseEventCatalogFromEnv } from '../src/model/supabaseEventTable'
import type { EmailOtpGateway } from './emailAuthApi'

export function createSupabaseEmailOtpGatewayFromEnv(
  env: Readonly<Record<string, unknown>> = {},
): EmailOtpGateway | null {
  if (env.SIDEQUEST_GROUPS_ENABLED !== 'true' || env.SIDEQUEST_AUTH_EMAIL_ENABLED !== 'true') {
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
    async signOut(token) {
      // The exact same caller-scoped Auth endpoint exercised by disposable CI.
      // Never accept a target account, service key or global logout scope.
      const response = await fetch(new URL('/auth/v1/logout?scope=local', url), {
        method: 'POST', redirect: 'error',
        headers: { apikey: key, Authorization: 'Bearer ' + token },
        signal: AbortSignal.timeout(10_000),
      })
      if (response.status !== 204 && response.status !== 200) {
        throw Error('Provider did not confirm session revocation.')
      }
    },
    async requestCode(email) {
      const client = newClient()
      const { error } = await client.auth.signInWithOtp({
        email, options: { shouldCreateUser: allowSignup },
      })
      if (error) throw Error('Code request was not accepted.')
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
      return { userId: data.user.id, accessToken, expiresAt }
    },
  }
}
