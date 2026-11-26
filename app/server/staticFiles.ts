// SERVER-ONLY: serves the built app from memory. At startup every file under dist/
// is read once, given an ETag, and compressed with brotli and gzip when that makes
// it smaller. A request then gets the best encoding it accepts, with no disk read.
// Vite's hashed /assets/* files never change, so browsers keep them for a year;
// index.html and the campus map are re-checked each visit (ETag, 304 when unchanged).
// HTML pages carry the security headers: a CSP built from what the pages need.
import { createHash } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative, sep } from 'node:path'
import { brotliCompress, brotliCompressSync, constants, gzipSync } from 'node:zlib'
import { promisify } from 'node:util'
import { requestIsHttps } from './clientIp'

export const MIME: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}
const COMPRESSIBLE = new Set(['.html', '.js', '.mjs', '.css', '.json', '.map', '.txt', '.webmanifest', '.svg', '.ico'])
export const IMMUTABLE = 'public, max-age=31536000, immutable'
const SHORT = 'public, max-age=3600'

type Variant = { body: Buffer; etag: string }
const brotli = promisify(brotliCompress)
// Startup stays fast (about 0.1 s for the whole app at quality 9); refineCompression then
// redoes brotli at quality 11 on libuv's thread pool, about 15% smaller, without blocking requests.
const QUICK_BROTLI = 9
const BEST_BROTLI = 11
type StaticFile = {
  type: string
  cache: string
  /** HTML only: hashes of the page's inline scripts, for its CSP. */
  scriptHashes: string[] | null
  identity: Variant
  br?: Variant
  gzip?: Variant
}
export type StaticSite = ReadonlyMap<string, StaticFile>

function walk(dir: string): string[] {
  let names: string[]
  try { names = readdirSync(dir) } catch { return [] }
  return names.flatMap(name => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

function sha256(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('base64')
}

/** The inline <script> bodies of an HTML page, hashed for script-src (the map has one). */
export function inlineScriptHashes(html: string): string[] {
  const hashes: string[] = []
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (/\bsrc\s*=/i.test(match[1]) || !match[2]) continue
    hashes.push(`'sha256-${sha256(match[2])}'`)
  }
  return hashes
}

/**
 * The Content-Security-Policy for one HTML page. Scripts: this origin plus the page's own
 * inline scripts by hash. Styles allow inline because the map writes style="" through
 * innerHTML and React sets style attributes. Images allow data: (the map's patterns) and
 * blob:. connect-src names ws:/wss: for this host as well as 'self' for older Safari.
 */
export function contentSecurityPolicy(scriptHashes: string[], wsHosts: string[] = []): string {
  return [
    "default-src 'self'",
    `script-src 'self'${scriptHashes.length ? ' ' + scriptHashes.join(' ') : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self'${wsHosts.map(host => ` ws://${host} wss://${host}`).join('')}`,
    "frame-src 'self'",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
}

function cacheFor(path: string): string {
  if (path.startsWith('/assets/')) return IMMUTABLE
  // The entry page and the map change on every deploy under the same names.
  if (path === '/index.html' || path.startsWith('/map/') || path.endsWith('.html')) return 'no-cache'
  // The service worker and manifest must be re-checked on every visit, or an update never lands.
  if (path === '/sw.js' || path === '/manifest.webmanifest') return 'no-cache'
  return SHORT
}

function variant(body: Buffer, tag: string): Variant {
  return { body, etag: `"${tag}"` }
}

/** Reads every file under `root` into memory and precompresses the text ones. */
export function loadStaticSite(root: string): StaticSite {
  const site = new Map<string, StaticFile>()
  for (const file of walk(root)) {
    const rel = '/' + relative(root, file).split(sep).join('/')
    const ext = extname(file).toLowerCase()
    const body = readFileSync(file)
    const tag = createHash('sha256').update(body).digest('base64url').slice(0, 27)
    const entry: StaticFile = {
      type: MIME[ext] ?? 'application/octet-stream',
      cache: cacheFor(rel),
      scriptHashes: ext === '.html' ? inlineScriptHashes(body.toString('utf8')) : null,
      identity: variant(body, tag),
    }
    if (COMPRESSIBLE.has(ext) && body.length > 512) {
      const br = brotliCompressSync(body, { params: {
        [constants.BROTLI_PARAM_QUALITY]: QUICK_BROTLI, [constants.BROTLI_PARAM_SIZE_HINT]: body.length,
      } })
      const gz = gzipSync(body, { level: 9 })
      if (br.length < body.length) entry.br = variant(br, tag + '-br')
      if (gz.length < body.length) entry.gzip = variant(gz, tag + '-gz')
    }
    site.set(rel, entry)
  }
  return site
}

/** Recompresses the brotli copies at the best quality in the background. Safe to skip. */
export async function refineCompression(site: StaticSite): Promise<void> {
  for (const file of site.values() as Iterable<StaticFile>) {
    if (!file.br) continue
    const body = file.identity.body
    const best = await brotli(body, { params: {
      [constants.BROTLI_PARAM_QUALITY]: BEST_BROTLI, [constants.BROTLI_PARAM_SIZE_HINT]: body.length,
    } })
    if (best.length < file.br.body.length) file.br = variant(best, file.identity.etag.slice(1, -1) + '-br11')
  }
}

/** q-values from Accept-Encoding; a coding with q=0 is refused. */
function accepts(header: string | undefined, coding: string): boolean {
  if (!header) return false
  for (const part of header.split(',')) {
    const [name, ...params] = part.trim().toLowerCase().split(';')
    if (name !== coding && name !== '*') continue
    const q = params.map(p => p.trim()).find(p => p.startsWith('q='))
    return q ? Number(q.slice(2)) > 0 : true
  }
  return false
}

const HOST = /^[a-z0-9.-]+(:\d{1,5})?$|^\[[0-9a-f:.]+\](:\d{1,5})?$/i

/** Headers every HTML page gets. HSTS only when the request really came over HTTPS. */
export function htmlSecurityHeaders(req: IncomingMessage, scriptHashes: string[]): Record<string, string> {
  const host = typeof req.headers.host === 'string' && HOST.test(req.headers.host) ? [req.headers.host] : []
  return {
    'Content-Security-Policy': contentSecurityPolicy(scriptHashes, host),
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    ...(requestIsHttps(req) ? { 'Strict-Transport-Security': 'max-age=31536000' } : {}),
  }
}

/** Serves a GET or HEAD from the in-memory site. Unknown paths answer 404. */
export function serveStatic(site: StaticSite, req: IncomingMessage, res: ServerResponse): void {
  let name: string
  try { name = decodeURIComponent(new URL(req.url ?? '/', 'http://sidequest.local').pathname) }
  catch { res.writeHead(404); res.end('Not found'); return }
  if (name.endsWith('/')) name += 'index.html'
  const file = site.get(name)
  if (!file) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Not found'); return }
  const encodingHeader = typeof req.headers['accept-encoding'] === 'string' ? req.headers['accept-encoding'] : undefined
  const [chosen, coding] = file.br && accepts(encodingHeader, 'br') ? [file.br, 'br']
    : file.gzip && accepts(encodingHeader, 'gzip') ? [file.gzip, 'gzip']
      : [file.identity, null]
  const headers: Record<string, string> = {
    'Content-Type': file.type,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': file.cache,
    ETag: chosen.etag,
    ...(file.br || file.gzip ? { Vary: 'Accept-Encoding' } : {}),
    ...(file.scriptHashes ? htmlSecurityHeaders(req, file.scriptHashes) : {}),
  }
  const match = req.headers['if-none-match']
  if (typeof match === 'string' && match.split(',').some(tag => tag.trim().replace(/^W\//, '') === chosen.etag || tag.trim() === '*')) {
    res.writeHead(304, headers)
    res.end()
    return
  }
  if (coding) headers['Content-Encoding'] = coding
  headers['Content-Length'] = String(chosen.body.length)
  res.writeHead(200, headers)
  res.end(req.method === 'HEAD' ? undefined : chosen.body)
}
