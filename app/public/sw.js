// SideQuest service worker. It makes the app installable and quick to reopen, and nothing more.
// What it keeps: the built scripts, styles, fonts and pictures under /assets/ (their names change
// on every build, so a kept copy is never stale), the icons, and one offline page.
// What it never keeps: /api/ and the live socket (events, plans, groups, busy time, anything
// personal), and the page itself, which always comes from the network. Offline, the student sees
// "You're offline" instead of an old list that could show cancelled events or stale free time.
const SHELL = 'sq-shell-v1'
const OFFLINE = ['/offline.html', '/offline.js', '/icons/icon-192.png', '/fonts/instrument-serif-latin-400-normal.woff2', '/fonts/urbanist-latin-wght-normal.woff2']

self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL).then(c => c.addAll(OFFLINE)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== SHELL).map(k => caches.delete(k))))
    .then(() => self.clients.claim()))
})

self.addEventListener('fetch', event => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/ws')) return
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('/offline.html')))
    return
  }
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok && (res.type === 'basic' || res.type === 'default')) { const copy = res.clone(); void caches.open(SHELL).then(c => c.put(req, copy)) }
      return res
    })))
  }
})
