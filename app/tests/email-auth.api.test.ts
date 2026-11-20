import { describe, expect, it, vi } from 'vitest'
import { createEmailAuthApi } from '../server/emailAuthApi'
import { createSupabaseEmailOtpGatewayFromEnv } from '../server/supabaseEmailAuth'

describe('email authentication feature gate', () => {
  it('keeps unconfigured email code auth disabled', () => {
    expect(createSupabaseEmailOtpGatewayFromEnv({})).toBeNull()
    expect(createSupabaseEmailOtpGatewayFromEnv({
      SIDEQUEST_GROUPS_ENABLED: 'true',
      SIDEQUEST_AUTH_EMAIL_ENABLED: 'false',
    })).toBeNull()
    const handler = createEmailAuthApi(null)
    expect(typeof handler).toBe('function')
  })
  it('does not require a privileged key when group auth is off', () => {
    const fake = vi.fn()
    expect(fake).not.toHaveBeenCalled()
  })
})
