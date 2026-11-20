// Production HTTP server: serves the built UI and same-origin catalog API.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve, sep, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createCatalogApi } from './api'
import { createGroupApi } from './groupApi'
import { createEmailAuthApi } from './emailAuthApi'
import { createSupabaseEmailOtpGatewayFromEnv } from './supabaseEmailAuth'
import { createSupabaseGroupGatewayFromEnv } from './supabaseGroupAccess'
import { createSupabaseEventCatalogFromEnv } from '../src/model/supabaseEventTable'

const api = createCatalogApi(createSupabaseEventCatalogFromEnv(process.env))
const groupApi = createGroupApi(createSupabaseGroupGatewayFromEnv(process.env))
const authApi = createEmailAuthApi(createSupabaseEmailOtpGatewayFromEnv(process.env))
const root = resolve(fileURLToPath(new URL('../dist/', import.meta.url)))
const mime: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff': 'font/woff', '.woff2': 'font/woff2', '.png': 'image/png' }
const port = Number(process.env.PORT ?? 3000)
createServer({ requestTimeout: 15_000, headersTimeout: 10_000 }, async (req, res) => {
  if (await authApi(req, res)) return
  if (await groupApi(req, res)) return
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
}).listen(port, '0.0.0.0', () => console.log(`SideQuest listening on port ${port}`))
