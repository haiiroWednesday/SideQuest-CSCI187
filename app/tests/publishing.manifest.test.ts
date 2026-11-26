import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'
import { loadStaticSite, serveStatic } from '../server/staticFiles'

const read = (path: string) => readFileSync(new URL('../' + path, import.meta.url))
const html = read('index.html').toString('utf8')
const manifest = JSON.parse(read('public/manifest.webmanifest').toString('utf8')) as {
  id: string; name: string; short_name: string; start_url: string; scope: string
  display: string; theme_color: string; background_color: string
  icons: { src: string; sizes: string; type: string; purpose: string }[]
}

describe('Online-only home screen publishing contract', () => {
  it('links the real app to a same-origin Discover launch with stable identity', () => {
    expect(html).toContain('rel="manifest" href="/manifest.webmanifest"')
    expect(html).toContain('rel="apple-touch-icon" href="/app-icons/icon-192.png"')
    expect(html).toContain('name="theme-color" content="' + manifest.theme_color + '"')
    expect(manifest).toMatchObject({ id: '/', name: 'SideQuest', short_name: 'SideQuest',
      start_url: '/#discover', scope: '/', display: 'standalone' })
    expect(manifest.background_color).toMatch(/^#[0-9a-f]{6}$/i)
    expect(manifest.icons.map(icon => icon.sizes)).toEqual(['192x192', '512x512'])
    for (const icon of manifest.icons) {
      expect(icon.src).toMatch(/^\/app-icons\/icon-\d+\.png$/)
      expect(icon.type).toBe('image/png')
      const file = read('public' + icon.src)
      expect(file.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
      expect(file.subarray(12, 16).toString()).toBe('IHDR')
      const [w, h] = icon.sizes.split('x').map(Number)
      expect(file.readUInt32BE(16)).toBe(w)
      expect(file.readUInt32BE(20)).toBe(h)
    }
    expect(manifest.icons[1].purpose.split(' ')).toContain('maskable')
  })

  it('serves manifest and icons with real MIME types, CSP and revalidation', async () => {
    const root = mkdtempSync(join(tmpdir(), 'sidequest-install-'))
    mkdirSync(join(root, 'app-icons'))
    writeFileSync(join(root, 'index.html'), html)
    writeFileSync(join(root, 'manifest.webmanifest'), read('public/manifest.webmanifest'))
    for (const icon of manifest.icons) writeFileSync(join(root, icon.src.slice(1)), read('public' + icon.src))
    const site = loadStaticSite(root)
    const server = createServer((req, res) => serveStatic(site, req, res))
    try {
      await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
      const base = 'http://127.0.0.1:' + (server.address() as AddressInfo).port
      const entry = await fetch(base + '/')
      expect(entry.status).toBe(200)
      expect(entry.headers.get('content-security-policy')).toContain("default-src 'self'")
      expect(await entry.text()).toContain('rel="manifest"')
      const res = await fetch(base + '/manifest.webmanifest')
      expect(res.status).toBe(200)
      expect(res.headers.get('content-type')).toContain('application/manifest+json')
      expect(await res.json()).toEqual(manifest)
      const etag = res.headers.get('etag')
      expect(etag).toBeTruthy()
      const again = await fetch(base + '/manifest.webmanifest', { headers: { 'If-None-Match': etag! } })
      expect(again.status).toBe(304)
      for (const icon of manifest.icons) {
        const response = await fetch(base + icon.src)
        expect(response.status).toBe(200)
        expect(response.headers.get('content-type')).toBe('image/png')
        expect(Buffer.from(await response.arrayBuffer())).toEqual(read('public' + icon.src))
      }
      expect((await fetch(base + '/sw.js')).status).toBe(404)
    } finally {
      await new Promise<void>(resolve => server.close(() => resolve()))
      rmSync(root, { recursive: true, force: true })
    }
  })
})
