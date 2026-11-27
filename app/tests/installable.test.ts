import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'
import { registerInstallableApp } from '../src/controller/installApp'

const pub = join(__dirname, '..', 'public')

describe('Add to Home Screen: the manifest', () => {
  const manifest = JSON.parse(readFileSync(join(pub, 'manifest.webmanifest'), 'utf8'))
  it('names the app, opens on Discover as a standalone app, and uses the maroon theme', () => {
    expect(manifest).toMatchObject({ name: 'SideQuest', short_name: 'SideQuest', start_url: '/#discover', scope: '/', display: 'standalone', theme_color: '#751728' })
  })
  it('lists icons that exist at the sizes they claim, with one maskable', () => {
    for (const icon of manifest.icons) {
      const png = readFileSync(join(pub, icon.src))
      const [w, h] = [png.readUInt32BE(16), png.readUInt32BE(20)]
      expect(`${w}x${h}`).toBe(icon.sizes)
    }
    expect(manifest.icons.some((i: { purpose: string }) => i.purpose === 'maskable')).toBe(true)
    expect(existsSync(join(pub, 'icons', 'apple-touch-icon.png'))).toBe(true)
  })
  it('is linked from the page', () => {
    const html = readFileSync(join(__dirname, '..', 'index.html'), 'utf8')
    expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest" />')
    expect(html).toContain('<meta name="theme-color" content="#751728" />')
  })
})

/** Runs public/sw.js against fake browser parts and returns what each request would get. */
function worker(network: (url: string) => Promise<Response>) {
  const listeners: Record<string, (e: unknown) => void> = {}
  const store = new Map<string, Response>()
  const cache = {
    addAll: vi.fn(async (urls: string[]) => { for (const u of urls) store.set(u, new Response('kept ' + u)) }),
    put: vi.fn(async (req: Request | string, res: Response) => { store.set(typeof req === 'string' ? req : new URL(req.url).pathname, res) }),
  }
  const caches = {
    open: async () => cache,
    keys: async () => ['sq-shell-v0', 'sq-shell-v1'],
    delete: vi.fn(async () => true),
    match: async (req: Request | string) => { const k = typeof req === 'string' ? req : new URL(req.url).pathname; return store.get(k)?.clone() },
  }
  const self = { location: { origin: 'https://sidequest.test' }, addEventListener: (t: string, f: (e: unknown) => void) => { listeners[t] = f }, skipWaiting: vi.fn(), clients: { claim: vi.fn() } }
  runInNewContext(readFileSync(join(pub, 'sw.js'), 'utf8'), { self, caches, fetch: (r: Request) => network(r.url), URL, Promise, Response })
  const wait = async (type: string) => { let p: Promise<unknown> = Promise.resolve(); listeners[type]({ waitUntil: (x: Promise<unknown>) => { p = x } }); await p }
  const ask = async (path: string, init: { method?: string; mode?: string } = {}) => {
    let answer: Promise<Response> | null = null
    const request = Object.assign(new Request('https://sidequest.test' + path, { method: init.method ?? 'GET' }), {})
    Object.defineProperty(request, 'mode', { value: init.mode ?? 'cors' })
    listeners.fetch({ request, respondWith: (r: Promise<Response>) => { answer = r } })
    return answer === null ? 'network, untouched' : await (await answer as Response).text()
  }
  return { wait, ask, store, caches }
}

describe('Add to Home Screen: what the service worker keeps', () => {
  it('keeps the offline page on install and clears older caches on activate', async () => {
    const w = worker(async () => new Response('net'))
    await w.wait('install')
    expect([...w.store.keys()]).toContain('/offline.html')
    await w.wait('activate')
    expect(w.caches.delete).toHaveBeenCalledWith('sq-shell-v0')
    expect(w.caches.delete).not.toHaveBeenCalledWith('sq-shell-v1')
  })
  it('never answers for /api/, the socket, posts or other sites', async () => {
    const w = worker(async () => new Response('net'))
    expect(await w.ask('/api/events')).toBe('network, untouched')
    expect(await w.ask('/api/personal/schedule')).toBe('network, untouched')
    expect(await w.ask('/ws')).toBe('network, untouched')
    expect(await w.ask('/api/events', { method: 'POST' })).toBe('network, untouched')
  })
  it('always fetches the page itself, and shows the offline page instead of an old one', async () => {
    let online = true
    const w = worker(async url => { if (!online) throw new TypeError('offline'); return new Response('fresh ' + new URL(url).pathname) })
    await w.wait('install')
    expect(await w.ask('/', { mode: 'navigate' })).toBe('fresh /')
    online = false
    expect(await w.ask('/', { mode: 'navigate' })).toBe('kept /offline.html')
  })
  it('keeps built files after the first fetch, since their names change every build', async () => {
    let calls = 0
    const w = worker(async () => { calls++; return new Response('bundle') })
    expect(await w.ask('/assets/index-abc123.js')).toBe('bundle')
    await new Promise(r => setTimeout(r, 0))
    expect(await w.ask('/assets/index-abc123.js')).toBe('bundle')
    expect(calls).toBe(1)
  })
})

describe('Add to Home Screen: registering', () => {
  const nav = (webdriver = false) => ({ webdriver, serviceWorker: { register: vi.fn(async () => ({})) } }) as unknown as Navigator
  const at = (href: string) => new URL(href) as unknown as Location
  it('registers on HTTPS and on localhost', () => {
    expect(registerInstallableApp(nav(), at('https://sidequest.onrender.com/'))).toBe(true)
    expect(registerInstallableApp(nav(), at('http://localhost:5173/'))).toBe(true)
  })
  it('does not register on plain HTTP, without support, or under automation unless asked', () => {
    expect(registerInstallableApp(nav(), at('http://192.168.1.4:5173/'))).toBe(false)
    expect(registerInstallableApp({} as Navigator, at('https://x.test/'))).toBe(false)
    expect(registerInstallableApp(nav(true), at('https://x.test/'))).toBe(false)
    expect(registerInstallableApp(nav(true), at('https://x.test/?sw-test'))).toBe(true)
  })
})
