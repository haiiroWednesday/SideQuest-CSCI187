// SERVER CONTROLLER: passwordless email-code authentication for optional
// group planning. It is OFF by default and never sets a browser credential
// cookie or persists a token. Access tokens are returned only after a verified
// code exchange and must be kept in tab memory by the client.
import { createHmac, randomBytes } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { SignInPolicy } from './signInPolicy'

export type VerifiedEmailSession = {
  userId: string
  /** The address Supabase Auth holds for this user, checked against the sign-in policy. */
  email?: string
  accessToken: string
  expiresAt: number // UNIX milliseconds, never an arbitrary client value
}
export interface EmailOtpGateway {
  /** Sends the sign-in email. Default Supabase templates send a link back to `redirectTo`; custom ones can add a code. */
  requestCode(email: string, redirectTo?: string): Promise<void>
  verifyCode(email: string, code: string): Promise<VerifiedEmailSession | null>
  /** Checks an access token that came back in a sign-in link with Supabase Auth. */
  sessionFromLink?(accessToken: string): Promise<VerifiedEmailSession | null>
}

/** The email provider refused to send for a reason that says nothing about the account. */
export class EmailSendError extends Error {
  constructor(readonly reason: 'limit' | 'outage') {
    super(reason === 'limit' ? 'Email limit reached.' : 'Email service unavailable.')
  }
}

class AuthHttpError extends Error {
  constructor(readonly status: number, message: string) { super(message) }
}
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CODE_PATTERN = /^\d{6,8}$/
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_BYTES = 1024

function json(res: ServerResponse, status: number, value: unknown): void {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, private',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
  })
  res.end(JSON.stringify(value))
}
async function body(req: IncomingMessage): Promise<Record<string, unknown>> {
  if (!req.headers['content-type']?.toLowerCase().startsWith('application/json')) {
    throw new AuthHttpError(415, 'Send the request as JSON.')
  }
  const chunks: Buffer[] = []
  let size = 0
  for await (const part of req) {
    size += Buffer.byteLength(part)
    if (size <= MAX_BYTES) chunks.push(Buffer.isBuffer(part) ? part : Buffer.from(part))
  }
  if (size > MAX_BYTES) throw new AuthHttpError(413, 'The request is too large.')
  let parsed: unknown
  try { parsed = JSON.parse(Buffer.concat(chunks).toString('utf8')) }
  catch { throw new AuthHttpError(400, 'Invalid request.') }
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new AuthHttpError(400, 'Invalid request.')
  }
  return parsed as Record<string, unknown>
}
function emailFrom(data: Record<string, unknown>, allowed: string[]): string {
  if (Object.keys(data).some(key => !allowed.includes(key)) ||
      typeof data.email !== 'string') throw new AuthHttpError(400, 'Enter a valid email address.')
  const email = data.email.trim().toLowerCase()
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    throw new AuthHttpError(400, 'Enter a valid email address.')
  }
  return email
}

/** What a signed-in student can use on this server. Reported by /api/auth/status so the app shows only working pages. */
export type SignInFeatures = { groups: boolean; accounts: boolean }

export function createEmailAuthApi(
  gateway: EmailOtpGateway | null,
  clock: () => number = Date.now,
  features?: SignInFeatures,
  policy?: SignInPolicy,
) {
  const pepper = randomBytes(32)
  const counters = new Map<string, { count: number; until: number }>()
  const limits = (email: string, ip: string, purpose: 'request' | 'verify') => {
    const key = purpose + ':' + createHmac('sha256', pepper).update(email + '\0' + ip).digest('hex')
    const now = clock()
    for (const [id, row] of counters) if (row.until <= now) counters.delete(id)
    if (counters.size >= 10000 && !counters.has(key)) {
      throw new AuthHttpError(429, 'Too many attempts. Try again later.')
    }
    const max = purpose === 'request' ? 3 : 10
    const saved = counters.get(key) ?? { count: 0, until: now + 900000 }
    if (saved.count >= max) throw new AuthHttpError(429, 'Too many attempts. Try again later.')
    saved.count++
    counters.set(key, saved)
  }

  return async (req: IncomingMessage, res: ServerResponse): Promise<boolean> => {
    let path: string
    try { path = new URL(req.url ?? '/', 'http://sidequest.local').pathname }
    catch { return false }
    if (!['/api/auth/status', '/api/auth/request-code', '/api/auth/verify-code', '/api/auth/link-session'].includes(path)) {
      return false
    }
    if (path === '/api/auth/status') {
      if (req.method !== 'GET') json(res, 405, { error: 'Use GET.' })
      else json(res, 200, features && gateway ? { enabled: true, ...features } : { enabled: gateway !== null })
      return true
    }
    if (!gateway) {
      json(res, 503, { error: 'Group sign-in is not enabled.' })
      return true
    }
    try {
      if (req.method !== 'POST') throw new AuthHttpError(405, 'Use POST.')
      const origin = req.headers.origin
      // Authentication always requires a same-origin browser request.
      // Explicit origin is required, including for code requests.
      if (typeof origin !== 'string' || !req.headers.host) {
        throw new AuthHttpError(403, 'Use the SideQuest site to sign in.')
      }
      let expectedHost = ''
      try { expectedHost = new URL(origin).host }
      catch { /* malformed origin is forbidden */ }
      if (expectedHost !== req.headers.host) {
        throw new AuthHttpError(403, 'Use the SideQuest site to sign in.')
      }
      const request = await body(req)
      const ip = req.socket.remoteAddress ?? 'unknown'
      if (path === '/api/auth/link-session') {
        // A sign-in link put a token in the app's address. The app sends it here once and the
        // server asks Supabase Auth who it belongs to before the app may use it.
        limits('link', ip, 'verify')
        if (!gateway.sessionFromLink || Object.keys(request).join() !== 'accessToken' ||
            typeof request.accessToken !== 'string' || request.accessToken.length < 20 || request.accessToken.length > 8192) {
          throw new AuthHttpError(400, 'This sign-in link is not valid. Ask for a new one.')
        }
        let session: VerifiedEmailSession | null
        try { session = await gateway.sessionFromLink(request.accessToken) }
        catch { session = null }
        if (!session || !UUID_PATTERN.test(session.userId) || session.accessToken !== request.accessToken ||
          !Number.isFinite(session.expiresAt) || session.expiresAt <= clock() + 5000) {
          throw new AuthHttpError(401, 'This sign-in link has expired or was already used. Ask for a new one.')
        }
        if (policy && !policy.allows(session.email)) throw new AuthHttpError(403, policy.message)
        json(res, 200, { userId: session.userId, accessToken: session.accessToken, expiresAt: session.expiresAt })
        return true
      }
      const email = emailFrom(request, path.endsWith('verify-code') ? ['email', 'code'] : ['email'])
      // Only addresses the policy allows get an email at all (Santa Clara accounts by default).
      if (policy && !policy.allows(email)) throw new AuthHttpError(403, policy.message)
      if (path === '/api/auth/request-code') {
        limits(email, ip, 'request')
        // Regardless of whether account creation was permitted upstream, avoid
        // disclosing whether an email corresponds to an existing account.
        // The link returns to the page that asked, already checked as same-origin above.
        // A deployed origin must also be listed in Supabase Auth's Redirect URLs.
        // A send that failed for reasons unrelated to the account (the sender's hourly limit, an
        // outage) is reported, so nobody waits for an email that never left. Anything else stays generic.
        try { await gateway.requestCode(email, origin) }
        catch (error) {
          if (error instanceof EmailSendError) {
            throw new AuthHttpError(error.reason === 'limit' ? 429 : 503, error.reason === 'limit'
              ? 'The email limit was reached. Try again in an hour.'
              : 'The email did not send. Try again in a few minutes.')
          }
        }
        json(res, 200, { message: 'If this email can sign in, a code is on its way.' })
      } else {
        limits(email, ip, 'verify')
        if (typeof request.code !== 'string' || !CODE_PATTERN.test(request.code)) {
          throw new AuthHttpError(400, 'Enter the verification code from your email.')
        }
        let session: VerifiedEmailSession | null
        try { session = await gateway.verifyCode(email, request.code) }
        catch { session = null }
        if (!session || !UUID_PATTERN.test(session.userId) ||
          typeof session.accessToken !== 'string' ||
          session.accessToken.length < 20 || session.accessToken.length > 8192 ||
          !Number.isFinite(session.expiresAt) || session.expiresAt <= clock() + 5000) {
          throw new AuthHttpError(401, 'The verification code is invalid or expired.')
        }
        if (policy && !policy.allows(session.email ?? email)) throw new AuthHttpError(403, policy.message)
        json(res, 200, {
          userId: session.userId,
          accessToken: session.accessToken,
          expiresAt: session.expiresAt,
        })
      }
    } catch (error) {
      if (error instanceof AuthHttpError) json(res, error.status, { error: error.message })
      else json(res, 503, { error: 'The sign-in service is unavailable.' })
    }
    return true
  }
}
