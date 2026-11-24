// Exports each landmark's drawn front from the campus map as a transparent PNG.
// The pictures become the made-for-you image on events held in that building.
// Run after changing a front: node scripts/export-fronts.mjs
import { chromium } from '@playwright/test'
import { createServer } from 'node:http'
import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'

const root = join(process.cwd(), 'public')
const types = { '.html': 'text/html', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png' }
const server = createServer(async (req, res) => {
  const path = normalize(join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname)))
  if (!path.startsWith(root)) { res.writeHead(403).end(); return }
  try { res.writeHead(200, { 'content-type': types[extname(path)] ?? 'application/octet-stream' }).end(await readFile(path)) }
  catch { res.writeHead(404).end() }
}).listen(0, '127.0.0.1')
await new Promise(r => server.once('listening', r))
const { port } = server.address()

const browser = await chromium.launch(process.env.SIDEQUEST_CHROMIUM_PATH ? { executablePath: process.env.SIDEQUEST_CHROMIUM_PATH } : {})
const page = await browser.newPage({ viewport: { width: 900, height: 900 } })
await page.goto(`http://127.0.0.1:${port}/map/index.html`)
await page.waitForFunction(() => typeof window.SQ_FRONTS === 'function')
const fronts = await page.evaluate(() => window.SQ_FRONTS())
for (const f of fronts) {
  // Fronts redrawn from photos by scripts/draw-fronts.mjs win over the map's older drawings.
  if (existsSync(`src/view/assets/fronts/src/${f.slug}.svg`)) { console.log('kept redrawn', f.slug); continue }
  const data = await page.evaluate(slug => {
    const host = document.createElement('div'); host.style.cssText = 'position:fixed;left:0;top:0;width:900px'
    const c = document.createElement('canvas'); host.appendChild(c); document.body.appendChild(host)
    window.SQ_FRONT(slug, c)
    const url = c.toDataURL('image/png'); host.remove(); return url
  }, f.slug)
  await writeFile(`src/view/assets/fronts/${f.slug}.png`, Buffer.from(data.split(',')[1], 'base64'))
  console.log('exported', f.slug)
}
await browser.close(); server.close()
