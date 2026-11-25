// Production HTTP server: serves the built UI and same-origin catalog API.
import { createSocialApiFromEnv } from './socialApi'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve, sep, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createCatalogApi } from './api'
import type { CatalogPublisherPort } from '../src/model/catalogChanged'
import { attachCatalogRealtime } from './catalogRealtime'
import { createAiDiscoverApi } from './aiDiscover'
import { createGroupApi } from './groupApi'
import { createSignInPolicy } from './signInPolicy'
import { createEmailAuthApi } from './emailAuthApi'
import { createSupabaseEmailOtpGatewayFromEnv } from './supabaseEmailAuth'
import { createSupabaseGroupGatewayFromEnv } from './supabaseGroupAccess'
import { createPersonalApi } from './personalApi'
import { accountsEnabled, createSupabasePersonalGatewayFromEnv } from './personalSupabase'
import { createSupabaseEventCatalogFromEnv } from '../src/model/supabaseEventTable'

const catalog = createSupabaseEventCatalogFromEnv(process.env)
let realtime: ReturnType<typeof attachCatalogRealtime> | null = null
const notifications: CatalogPublisherPort = {
  publish(eventId) { realtime?.publish(eventId) },
}
const api = createCatalogApi(catalog, Date.now, notifications)
const ai = createAiDiscoverApi(catalog, { apiKey: process.env.OPENAI_API_KEY, model: process.env.SIDEQUEST_AI_MODEL })
const groupApi = createGroupApi(createSupabaseGroupGatewayFromEnv(process.env))
const authApi = createEmailAuthApi(createSupabaseEmailOtpGatewayFromEnv(process.env), Date.now,
  { groups: process.env.SIDEQUEST_GROUPS_ENABLED === 'true', accounts: accountsEnabled(process.env) },
  createSignInPolicy(process.env))
const personalApi = createPersonalApi(createSupabasePersonalGatewayFromEnv(process.env))
// Open invites and find-a-time: off until supabase/proposals/20261125020000_open_invites_REVIEW_ONLY.sql is approved.
const socialApi = createSocialApiFromEnv(process.env)
const root = resolve(fileURLToPath(new URL('../dist/', import.meta.url)))
const mime: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff': 'font/woff', '.woff2': 'font/woff2', '.png': 'image/png' }
const port = Number(process.env.PORT ?? 3000)
const server = createServer({ requestTimeout: 15_000, headersTimeout: 10_000 }, (req, res) => {
  // One bad request must never stop the server for everyone: any handler that throws gets a 500.
  handle(req, res).catch(() => {
    if (!res.headersSent) res.writeHead(500)
    res.end()
  })
})
async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (await authApi(req, res)) return
  if (await personalApi(req, res)) return
  if (req.url?.startsWith('/api/google/') && await (await import('./googleApi')).googleApi(req, res)) return
  if (await socialApi(req, res)) return
  if (await groupApi(req, res)) return
  if (await ai(req, res)) return
  if (await api(req, res)) return
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return }
  try {
    const url = new URL(req.url ?? '/', 'http://sidequest.local')
    const name = decodeURIComponent(url.pathname)
    const path = resolve(root, name === '/' ? 'index.html' : `.${name}`)
    if (path !== root && !path.startsWith(root + sep)) { res.writeHead(403); res.end(); return }
    const body = await readFile(path)
    res.writeHead(200, { 'Content-Type': mime[extname(path)] ?? 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': extname(path) === '.html' ? 'no-store' : 'public, max-age=3600' })
    res.end(req.method === 'HEAD' ? undefined : body)
  } catch { res.writeHead(404); res.end('Not found') }
}
realtime = attachCatalogRealtime(server)
server.listen(port, '0.0.0.0', () => console.log(`SideQuest listening on port ${port}`))
