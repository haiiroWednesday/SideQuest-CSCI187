// Local PostgREST-shaped test fixture. Never shipped in the production server.
import { createServer } from 'node:http'
let rows = [], methods = [], failReads = false, failInserts = false
const send = (res, code, data) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)) }
createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  let body = ''; for await (const part of req) body += part
  if (url.pathname === '/__fixture/reset') { const data = JSON.parse(body); rows = data.rows; methods = []; failReads = false; failInserts = false; return send(res, 200, {}) }
  if (url.pathname === '/__fixture/fail') { const data = JSON.parse(body); if ('reads' in data) failReads = data.reads; if ('inserts' in data) failInserts = data.inserts; return send(res, 200, {}) }
  if (url.pathname === '/__fixture/state') return send(res, 200, { rows, methods })
  if (url.pathname !== '/rest/v1/events') return send(res, 404, {})
  methods.push(req.method)
  if (req.headers.apikey !== 'sb_publishable_server_fixture') return send(res, 401, { message: 'Fixture key missing on server request' })
  if ((failReads && req.method === 'GET') || (failInserts && req.method === 'POST')) return send(res, 500, { message: 'Fixture unavailable' })
  if (req.method === 'POST') {
    const data = JSON.parse(body)
    if ('id' in data || 'created_at' in data) return send(res, 400, { message: 'Server-owned columns' })
    const id = `${String(rows.length + 1).padStart(8, '0')}-1111-4111-8111-111111111111`
    const row = { ...data, id, start_time: `${data.start_time}:00`, end_time: `${data.end_time}:00` }
    rows.push(row); return send(res, 201, row)
  }
  if (req.method !== 'GET') return send(res, 403, {})
  const id = url.searchParams.get('id')?.replace(/^eq\./, ''), from = url.searchParams.get('event_date')?.replace(/^gte\./, '')
  const result = rows.filter(row => (!id || row.id === id) && (!from || row.event_date >= from))
    .sort((a,b) => a.event_date.localeCompare(b.event_date) || a.start_time.localeCompare(b.start_time) || a.id.localeCompare(b.id))
  if (req.headers.accept?.includes('vnd.pgrst.object')) return send(res, 200, result[0] ?? null)
  return send(res, 200, result)
}).listen(5176, '127.0.0.1')
