// SERVER-ONLY: which address a request comes from, for rate limits and socket caps.
// Without SIDEQUEST_TRUST_PROXY the TCP peer is the client. Behind a hosting proxy
// (Render, Fly, a load balancer) every request has the proxy's address, so all
// students would share one bucket. With SIDEQUEST_TRUST_PROXY=true the right-most
// X-Forwarded-For entry is used: the one the platform's own proxy appended, which a
// client cannot forge. Set it to a number (2, 3) when that many trusted proxies
// each append an entry. Never set it on a server that is reachable directly.
import type { IncomingMessage } from 'node:http'
import { isIP } from 'node:net'

let trustedHops = 0

/** Reads SIDEQUEST_TRUST_PROXY: "true" means one trusted proxy, a whole number means that many. */
export function trustedProxyHops(env: Readonly<Record<string, unknown>>): number {
  const raw = String(env.SIDEQUEST_TRUST_PROXY ?? '').trim().toLowerCase()
  if (raw === 'true' || raw === 'yes') return 1
  const hops = Number(raw)
  return Number.isInteger(hops) && hops > 0 && hops <= 5 ? hops : 0
}

/** Called once by the server wiring (server/handlers.ts). */
export function configureClientIp(env: Readonly<Record<string, unknown>>): void {
  trustedHops = trustedProxyHops(env)
}

function normalize(address: string): string {
  const plain = address.trim().replace(/^\[|\]$/g, '')
  // IPv4 clients on a dual-stack socket arrive as ::ffff:1.2.3.4.
  return /^::ffff:\d+\.\d+\.\d+\.\d+$/i.test(plain) ? plain.slice(7) : plain.toLowerCase()
}

/** The client address used as a rate-limit key. */
export function clientIp(req: IncomingMessage, hops: number = trustedHops): string {
  const peer = normalize(req.socket?.remoteAddress ?? 'unknown')
  if (hops <= 0) return peer
  const header = req.headers['x-forwarded-for']
  const joined = Array.isArray(header) ? header.join(',') : header
  if (typeof joined !== 'string') return peer
  const entries = joined.split(',').map(normalize).filter(Boolean)
  const chosen = entries[entries.length - hops]
  return chosen && isIP(chosen) ? chosen : peer
}

/** True when the browser reached us over HTTPS (directly, or through a trusted proxy). */
export function requestIsHttps(req: IncomingMessage, hops: number = trustedHops): boolean {
  if ((req.socket as { encrypted?: boolean } | undefined)?.encrypted) return true
  if (hops <= 0) return false
  const header = req.headers['x-forwarded-proto']
  const value = Array.isArray(header) ? header.join(',') : header
  const entries = typeof value === 'string' ? value.split(',').map(part => part.trim().toLowerCase()).filter(Boolean) : []
  return entries.length > 0 && entries[Math.max(0, entries.length - hops)] === 'https'
}
