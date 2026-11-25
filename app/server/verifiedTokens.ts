// SERVER-ONLY: a guard in front of Supabase Auth getUser. Any 20-character string
// in an Authorization header used to cost one Auth round trip, so a script could
// turn this server into an amplifier. Now each client IP gets a small budget of
// Auth checks per minute, and a confirmed session is remembered for 30 seconds,
// keyed by a SHA-256 of the token (the token itself is never kept). Only confirmed
// sessions are remembered: a refusal or an Auth outage is asked again next time.
import { createHash } from 'node:crypto'
import type { IncomingMessage } from 'node:http'
import { clientIp } from './clientIp'

export const VERIFIED_TOKEN_TTL_MS = 30_000
export const AUTH_CHECKS_PER_IP_PER_MINUTE = 120
const MAX_REMEMBERED = 5000
const MAX_IPS = 10_000

/** Thrown when one IP asks Supabase Auth about too many new tokens in a minute. */
export class AuthCheckLimitError extends Error {
  constructor() { super('Too many sign-in checks. Wait a minute and try again.') }
}

export function createVerifiedTokenGuard(clock: () => number = Date.now, options: { ttlMs?: number; perMinute?: number } = {}) {
  const ttl = options.ttlMs ?? VERIFIED_TOKEN_TTL_MS
  const perMinute = options.perMinute ?? AUTH_CHECKS_PER_IP_PER_MINUTE
  const remembered = new Map<string, { until: number; value: unknown }>()
  const checks = new Map<string, { count: number; until: number }>()

  const spend = (ip: string, now: number) => {
    for (const [key, row] of checks) if (row.until <= now) checks.delete(key)
    // Evict the oldest bucket instead of refusing everyone when the table is full.
    if (checks.size >= MAX_IPS && !checks.has(ip)) checks.delete(checks.keys().next().value as string)
    const row = checks.get(ip) ?? { count: 0, until: now + 60_000 }
    if (row.count >= perMinute) throw new AuthCheckLimitError()
    row.count++
    checks.set(ip, row)
  }

  return {
    /** Runs `verify` at most once per token per 30 s, and only within the caller IP's budget. */
    async check<T>(req: IncomingMessage, token: string, verify: (token: string) => Promise<T | null>): Promise<T | null> {
      const now = clock()
      const key = createHash('sha256').update(token).digest('base64url')
      const hit = remembered.get(key)
      if (hit && hit.until > now) return hit.value as T
      if (hit) remembered.delete(key)
      spend(clientIp(req), now)
      const value = await verify(token)
      if (value !== null && value !== undefined) {
        if (remembered.size >= MAX_REMEMBERED) {
          for (const [id, row] of remembered) if (row.until <= now) remembered.delete(id)
          if (remembered.size >= MAX_REMEMBERED) remembered.delete(remembered.keys().next().value as string)
        }
        remembered.set(key, { until: now + ttl, value })
      }
      return value
    },
  }
}

export type VerifiedTokenGuard = ReturnType<typeof createVerifiedTokenGuard>
