// Production HTTP server: serves the built UI and same-origin catalog API.
// The API handlers come from server/handlers.ts, the same list the Vite dev server uses.
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { CatalogPublisherPort } from '../src/model/catalogChanged'
import { attachCatalogRealtime } from './catalogRealtime'
import { createServerHandlers, runHandlers } from './handlers'
import { loadStaticSite, refineCompression, serveStatic } from './staticFiles'

let realtime: ReturnType<typeof attachCatalogRealtime> | null = null
const notifications: CatalogPublisherPort = {
  publish(eventId) { realtime?.publish(eventId) },
}
const handlers = createServerHandlers(process.env, { publisher: notifications })
const root = resolve(fileURLToPath(new URL('../dist/', import.meta.url)))
// Read and compressed once here; requests never touch the disk.
const site = loadStaticSite(root)
const port = Number(process.env.PORT ?? 3000)
const server = createServer({ requestTimeout: 15_000, headersTimeout: 10_000 }, (req, res) => {
  // One bad request must never stop the server for everyone: any handler that throws gets a 500.
  handle(req, res).catch(() => {
    if (!res.headersSent) res.writeHead(500)
    res.end()
  })
})
async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (await runHandlers(handlers, req, res)) return
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return }
  serveStatic(site, req, res)
}
realtime = attachCatalogRealtime(server)
server.listen(port, '0.0.0.0', () => {
  console.log(`SideQuest listening on port ${port}`)
  void refineCompression(site).catch(() => { /* the quick brotli copies stay in use */ })
})
