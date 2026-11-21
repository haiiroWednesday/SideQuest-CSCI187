// Read-only public event notifications. Catalog data still comes from GET /api/events.
// This hub is intentionally per-process: deploy one Node instance until a shared
// pub/sub backplane exists, rather than promising cross-instance delivery.
import type { IncomingMessage, Server as HttpServer } from 'node:http'
import type { Duplex } from 'node:stream'
import { WebSocket, WebSocketServer } from 'ws'
import { isCatalogId } from '../src/model/eventCatalog'
import type { CatalogChanged } from '../src/model/catalogChanged'

export const CATALOG_LIVE_PATH = '/api/events/live'
export const MAX_CATALOG_SUBSCRIBERS = 128
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

export function attachCatalogRealtime(server: HttpServer) {
  const sockets = new WebSocketServer({ noServer: true, perMessageDeflate: false, maxPayload: 512 })
  const healthy = new WeakMap<WebSocket, boolean>()

  const upgrade = (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    let url: URL
    try { url = new URL(req.url ?? '/', 'http://sidequest.local') }
    catch { denyUpgrade(socket, 400, 'Bad Request'); return }
    // Other upgrade listeners (including Vite HMR in development) remain untouched.
    if (url.pathname !== CATALOG_LIVE_PATH) return
    if (url.search || req.method !== 'GET' || !sameSiteOrigin(req)) {
      denyUpgrade(socket, 403, 'Forbidden'); return
    }
    if (sockets.clients.size >= MAX_CATALOG_SUBSCRIBERS) {
      denyUpgrade(socket, 503, 'Service Unavailable'); return
    }
    sockets.handleUpgrade(req, socket, head, client => {
      sockets.emit('connection', client, req)
    })
  }

  sockets.on('connection', client => {
    healthy.set(client, true)
    client.on('pong', () => { healthy.set(client, true) })
    client.on('message', () => { client.close(1008, 'Read-only catalog channel') })
  })

  const heartbeat = setInterval(() => {
    for (const client of sockets.clients) {
      if (client.readyState !== WebSocket.OPEN) continue
      if (!healthy.get(client)) { client.terminate(); continue }
      healthy.set(client, false)
      client.ping()
    }
  }, PING_INTERVAL_MS)
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
        try { client.send(payload) } catch { client.terminate() }
      }
    },
    close: cleanup,
  }
}
