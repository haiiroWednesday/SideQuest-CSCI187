// Read-only public event notifications. Catalog data still comes from GET /api/events.
// This hub is intentionally per-process: deploy one Node instance until a shared
// pub/sub backplane exists, rather than promising cross-instance delivery.
import type { IncomingMessage, Server as HttpServer } from 'node:http'
import type { Duplex } from 'node:stream'
import { WebSocket, WebSocketServer } from 'ws'
import { isCatalogId } from '../src/model/eventCatalog'
import type { CatalogChanged } from '../src/model/catalogChanged'
import { clientIp } from './clientIp'

export const CATALOG_LIVE_PATH = '/api/events/live'
export const MAX_CATALOG_SUBSCRIBERS = 128
/** Live sockets one client IP may hold at once (a few tabs). */
export const MAX_SUBSCRIBERS_PER_IP = 4
/** A subscriber that has been sent nothing for this long is closed; the app reconnects when it needs to. */
export const IDLE_LIMIT_MS = 15 * 60_000
/** Close code for an idle socket (4000-4999 are for applications). */
export const IDLE_CLOSE_CODE = 4000
const MAX_BUFFERED_BYTES = 64 * 1024
const PING_INTERVAL_MS = 30_000

function sameSiteOrigin(req: IncomingMessage): boolean {
  if (!req.headers.origin || !req.headers.host) return false
  try {
    const origin = new URL(req.headers.origin)
    return (origin.protocol === 'http:' || origin.protocol === 'https:') &&
      origin.host === req.headers.host && !origin.username && !origin.password
  } catch {
    return false
  }
}

function denyUpgrade(socket: Duplex, code: number, reason: string): void {
  socket.end(`HTTP/1.1 ${code} ${reason}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`)
}

export type CatalogRealtimeOptions = {
  /** Development only: leave other upgrade requests (Vite HMR) for other listeners. In production they are destroyed. */
  passThroughOtherUpgrades?: boolean
  clock?: () => number
  pingIntervalMs?: number
}

export function attachCatalogRealtime(server: HttpServer, options: CatalogRealtimeOptions = {}) {
  const clock = options.clock ?? Date.now
  const sockets = new WebSocketServer({ noServer: true, perMessageDeflate: false, maxPayload: 512 })
  const healthy = new WeakMap<WebSocket, boolean>()
  const lastSent = new WeakMap<WebSocket, number>()
  const perIp = new Map<string, number>()
  // Upgrades accepted but not yet open count too, so a burst cannot slip past either cap.
  let opening = 0

  const upgrade = (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    let url: URL
    try { url = new URL(req.url ?? '/', 'http://sidequest.local') }
    catch { denyUpgrade(socket, 400, 'Bad Request'); return }
    if (url.pathname !== CATALOG_LIVE_PATH) {
      // No other listener in production would ever answer, so an open socket would only leak.
      if (!options.passThroughOtherUpgrades) socket.destroy()
      return
    }
    if (url.search || req.method !== 'GET' || !sameSiteOrigin(req)) {
      denyUpgrade(socket, 403, 'Forbidden'); return
    }
    if (sockets.clients.size + opening >= MAX_CATALOG_SUBSCRIBERS) {
      denyUpgrade(socket, 503, 'Service Unavailable'); return
    }
    const ip = clientIp(req)
    if ((perIp.get(ip) ?? 0) >= MAX_SUBSCRIBERS_PER_IP) {
      denyUpgrade(socket, 429, 'Too Many Requests'); return
    }
    perIp.set(ip, (perIp.get(ip) ?? 0) + 1)
    opening++
    let pending = true, released = false
    const opened = () => { if (pending) { pending = false; opening-- } }
    const release = () => {
      opened()
      if (released) return
      released = true
      const left = (perIp.get(ip) ?? 1) - 1
      if (left > 0) perIp.set(ip, left)
      else perIp.delete(ip)
    }
    // A failed handshake closes the socket without a client, so the slot is given back here too.
    socket.once('close', release)
    sockets.handleUpgrade(req, socket, head, client => {
      opened()
      client.once('close', release)
      sockets.emit('connection', client, req)
    })
  }

  sockets.on('connection', client => {
    healthy.set(client, true)
    lastSent.set(client, clock())
    client.on('pong', () => { healthy.set(client, true) })
    client.on('message', () => { client.close(1008, 'Read-only catalog channel') })
  })

  const heartbeat = setInterval(() => {
    const now = clock()
    for (const client of sockets.clients) {
      if (client.readyState !== WebSocket.OPEN) continue
      if (!healthy.get(client)) { client.terminate(); continue }
      // ws answers pings by itself, so a live-looking socket can still be abandoned. Free its slot.
      if (now - (lastSent.get(client) ?? now) >= IDLE_LIMIT_MS) { client.close(IDLE_CLOSE_CODE, 'Idle'); continue }
      healthy.set(client, false)
      client.ping()
    }
  }, options.pingIntervalMs ?? PING_INTERVAL_MS)
  heartbeat.unref()

  const cleanup = () => {
    clearInterval(heartbeat)
    server.off('upgrade', upgrade)
    for (const client of sockets.clients) client.terminate()
    sockets.close()
  }
  server.on('upgrade', upgrade)
  server.once('close', cleanup)

  return {
    publish(eventId: string): void {
      if (!isCatalogId(eventId)) return
      const message: CatalogChanged = { type: 'catalog.changed', eventId }
      const payload = JSON.stringify(message)
      for (const client of sockets.clients) {
        if (client.readyState !== WebSocket.OPEN) continue
        if (client.bufferedAmount > MAX_BUFFERED_BYTES) { client.terminate(); continue }
        try { client.send(payload); lastSent.set(client, clock()) } catch { client.terminate() }
      }
    },
    close: cleanup,
  }
}
