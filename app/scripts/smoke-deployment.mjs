// Read-only HTTPS/WSS acceptance probe. No posts, credentials or AI billable calls.
// Run: node scripts/smoke-deployment.mjs https://your-preview.onrender.com --expect-shared
// Add --expect-ai only after a server-held key and a real provider test are approved.
import WebSocket from 'ws'

const [rawUrl, ...flags] = process.argv.slice(2)
if (!rawUrl) {
  console.error('Usage: node scripts/smoke-deployment.mjs <https-url> [--expect-shared] [--expect-ai]')
  process.exit(2)
}
const url = new URL(rawUrl)
if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' ||
    url.search || url.hash || !flags.every(x => ['--expect-shared', '--expect-ai'].includes(x))) {
  console.error('Provide an HTTPS site origin and only supported flags.')
  process.exit(2)
}
const expectShared = flags.includes('--expect-shared')
const expectAi = flags.includes('--expect-ai')
const endpoint = path => new URL(path, url.origin)
async function read(path) {
  const response = await fetch(endpoint(path), { signal: AbortSignal.timeout(15_000), redirect: 'error' })
  return { status: response.status, data: await response.text() }
}
function assert(value, message) {
  if (!value) throw Error(message)
}
async function checkSocket() {
  return new Promise((resolve, reject) => {
    const wsUrl = new URL('/api/events/live', url)
    wsUrl.protocol = 'wss:'
    const socket = new WebSocket(wsUrl, { origin: url.origin, handshakeTimeout: 15_000 })
    let finished = false
    const timeout = setTimeout(() => finish(Error('WebSocket handshake timeout')), 18_000)
    function finish(error) {
      if (finished) return
      finished = true
      clearTimeout(timeout)
      if (error) { socket.terminate(); reject(error) }
      else { socket.close(1000, 'Read-only smoke complete'); resolve() }
    }
    socket.once('open', () => finish())
    socket.once('unexpected-response', (_, res) => finish(Error('WebSocket denied with HTTP ' + res.statusCode)))
    socket.once('error', error => finish(error))
  })
}
try {
  const home = await read('/')
  assert(home.status === 200 && /<html/i.test(home.data) && /SideQuest/i.test(home.data),
    'Built frontend was not served as SideQuest HTML.')
  console.log('PASS: HTTPS serves SideQuest HTML')
  const catalog = await read('/api/catalog')
  const status = JSON.parse(catalog.data)
  assert(catalog.status === 200 && typeof status.shared === 'boolean',
    'Shared catalog status endpoint unavailable.')
  if (expectShared) assert(status.shared, 'Shared Supabase catalog is not configured.')
  console.log('PASS: catalog configuration disclosed (' + (status.shared ? 'shared' : 'local-only') + ')')
  if (status.shared) {
    const events = await read('/api/events')
    assert(events.status === 200 && Array.isArray(JSON.parse(events.data)),
      'Shared public catalog did not load.')
    console.log('PASS: public catalog is readable')
  }
  const ai = await read('/api/ai/status')
  const aiStatus = JSON.parse(ai.data)
  assert(ai.status === 200 && typeof aiStatus.available === 'boolean',
    'AI status endpoint unavailable.')
  if (expectAi) assert(aiStatus.available, 'AI server config is unavailable.')
  console.log('PASS: AI configuration disclosed (' + (aiStatus.available ? 'configured' : 'off') + ')')
  const auth = await read('/api/auth/status')
  const authStatus = JSON.parse(auth.data)
  assert(auth.status === 200 && authStatus.enabled === false,
    'Authentication must remain OFF for this unapproved preview.')
  console.log('PASS: unapproved email sign-in remains disabled')
  await checkSocket()
  console.log('PASS: public read-only WSS handshake')
  console.log('READ-ONLY DEPLOYMENT SMOKE PASSED. This does NOT prove event broadcast or a live AI completion.')
} catch (error) {
  console.error('DEPLOYMENT SMOKE FAILED: ' + (error instanceof Error ? error.message : String(error)))
  process.exitCode = 1
}
