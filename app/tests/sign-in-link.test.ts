// Sign-in links from the default Supabase email come back as #access_token=…&type=magiclink.
// The token is read once and wiped from the address before the app draws; errors become a message.
import { describe, expect, it, vi } from 'vitest'
import { parseSignInLink, takeSignInLink } from '../src/controller/signInLink'

const TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.signature-for-tests'
const linkHash = (type = 'magiclink') => `#access_token=${TOKEN}&expires_at=1999999999&expires_in=3600&refresh_token=refresh-should-be-dropped&token_type=bearer&type=${type}`

describe('reading a sign-in link', () => {
  it('takes the access token from a magic link or a first-time sign-up link', () => {
    expect(parseSignInLink(linkHash())).toEqual({ kind: 'token', accessToken: TOKEN })
    expect(parseSignInLink(linkHash('signup'))).toEqual({ kind: 'token', accessToken: TOKEN })
  })
  it('ignores ordinary app addresses', () => {
    for (const hash of ['', '#discover', '#map/benson', '#walk/Ricard%20Observatory', '#day/abc']) expect(parseSignInLink(hash)).toBeNull()
  })
  it('refuses other token types and junk tokens', () => {
    expect(parseSignInLink(linkHash('recovery'))).toMatchObject({ kind: 'error' })
    expect(parseSignInLink('#access_token=short&type=magiclink')).toMatchObject({ kind: 'error' })
  })
  it('turns an expired or used link into a plain message', () => {
    const expired = parseSignInLink('#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired')
    expect(expired).toEqual({ kind: 'error', message: 'This sign-in link has expired or was already used. Ask for a new one.' })
    expect(parseSignInLink('', '?error=server_error&error_description=Something+odd')).toEqual({ kind: 'error', message: "Sign-in didn't work: Something odd." })
    const sneaky = parseSignInLink('#error=x&error_description=%3Cimg%20src%3Dx%3E')
    expect(sneaky?.kind === 'error' && sneaky.message).not.toMatch(/[<>]/)
  })
})

describe('wiping it from the address', () => {
  it('replaces the address (no new history entry) so the token is gone from the bar and Back', () => {
    const replaceState = vi.fn()
    const link = takeSignInLink({ hash: linkHash(), search: '', pathname: '/' }, { replaceState })
    expect(link).toEqual({ kind: 'token', accessToken: TOKEN })
    expect(replaceState).toHaveBeenCalledOnce()
    const address = replaceState.mock.calls[0][2] as string
    expect(address).toBe('/#discover')
    expect(address).not.toContain('token')
  })
  it('sends an error link to the sign-in page and drops the error words from the address', () => {
    const replaceState = vi.fn()
    takeSignInLink({ hash: '', search: '?error=access_denied&error_code=otp_expired&error_description=expired&keep=1', pathname: '/app/' }, { replaceState })
    expect(replaceState.mock.calls[0][2]).toBe('/app/?keep=1#login')
  })
  it('leaves an ordinary address alone', () => {
    const replaceState = vi.fn()
    expect(takeSignInLink({ hash: '#schedule', search: '', pathname: '/' }, { replaceState })).toBeNull()
    expect(replaceState).not.toHaveBeenCalled()
  })
})

describe('server: link token expiry', () => {
  it('reads exp from a token Supabase Auth accepted, and nothing from junk', async () => {
    const { tokenExpiry } = await import('../server/supabaseEmailAuth')
    const payload = Buffer.from(JSON.stringify({ exp: 2000000000 })).toString('base64url')
    expect(tokenExpiry(`h.${payload}.s`)).toBe(2000000000 * 1000)
    expect(tokenExpiry('not-a-jwt')).toBeNull()
  })
})
