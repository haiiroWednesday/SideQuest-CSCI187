/**
 * Read-only SCU event-source inventory and optional LiveWhale API-shape probe.
 *
 * Default: node scripts/audit-public-event-sources.mjs
 * Explicit GET-only probe: node scripts/audit-public-event-sources.mjs --probe-livewhale
 * Offline synthetic API check: node scripts/audit-public-event-sources.mjs --fixture=PATH
 *
 * This script never posts events, changes Supabase or guesses an end time.
 * A supported LiveWhale API *format* does not prove SCU enables that endpoint.
 */
import { readFile } from 'node:fs/promises'

const registry = new URL('../data/public-scu-event-sources-2026-11-24.json', import.meta.url)
const PROBE_URL = 'https://events.scu.edu/live/json/events/max/30/paginate/30/response_fields/location,summary,group_title'
const allowed = new Set(['--probe-livewhale'])
const MAX_JSON_BYTES = 250_000
const known = ['id', 'title', 'date', 'date2', 'date_time', 'date2_time', 'timezone',
  'url', 'location', 'location_title', 'summary', 'group_title', 'date_ts', 'date2_ts',
  'is_all_day', 'repeats', 'visibility', 'last_modified']

export function inspectPayload(raw) {
  if (typeof raw !== 'object' || raw === null) throw Error('API body is not a JSON object/array.')
  const records = Array.isArray(raw) ? raw
    : Array.isArray(raw.data) ? raw.data
      : Array.isArray(raw.results) ? raw.results : null
  if (!records) throw Error('Unknown LiveWhale JSON structure; expected data/results array.')
  if (records.length > 1000) throw Error('Refusing unexpectedly large response.')
  if (records.some(x => typeof x !== 'object' || x === null || Array.isArray(x))) {
    throw Error('API contains non-object event records.')
  }
  const version = Array.isArray(raw) ? 'v1-array'
    : Array.isArray(raw.data) ? 'v2-style-data' : 'v1-paginated-results'
  const fields = [...new Set(records.slice(0, 10).flatMap(x => Object.keys(x)))].sort()
  return {
    format: version,
    inspected: records.length,
    fieldNames: fields.filter(key => known.includes(key)),
    unknownFieldCount: fields.filter(key => !known.includes(key)).length,
    // This is a SHAPE probe, not evidence that fields contain verified data.
    hasTimeKeys: fields.includes('date_time') && fields.includes('date2_time'),
    explicitEndKeyFound: fields.includes('date2_time') || fields.includes('date2_ts'),
    needsHumanSourceValidation: true,
    published: false,
  }
}

async function readLimited(response) {
  if (!response.ok) throw Error('HTTP ' + response.status + ' from read-only SCU API candidate.')
  if (!response.headers.get('content-type')?.toLowerCase().includes('json')) {
    throw Error('SCU endpoint did not return JSON.')
  }
  const reader = response.body?.getReader()
  if (!reader) throw Error('API response has no readable body.')
  let count = 0
  const chunks = []
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      count += value.length
      if (count > MAX_JSON_BYTES) throw Error('API response exceeds the bounded size limit.')
      chunks.push(value)
    }
  } finally {
    await reader.cancel().catch(() => {})
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

async function audit() {
  const args = process.argv.slice(2)
  const fixture = args.filter(x => x.startsWith('--fixture='))
  if (fixture.length > 1 || (fixture.length && args.length !== 1) ||
      (!fixture.length && (args.some(x => !allowed.has(x)) || args.length !== new Set(args).size))) {
    throw Error('Usage: node scripts/audit-public-event-sources.mjs [--probe-livewhale | --fixture=PATH]')
  }
  const manifest = JSON.parse(await readFile(registry, 'utf8'))
  if (!Array.isArray(manifest.sources)) throw Error('Source registry is invalid.')
  const ids = new Set()
  for (const source of manifest.sources) {
    if (!source.id || ids.has(source.id)) throw Error('Missing or duplicated source ID.')
    ids.add(source.id)
    const url = new URL(source.url)
    if (url.protocol !== 'https:' || url.username || url.password || url.port) {
      throw Error('Source requires an unapproved URL: ' + source.id)
    }
  }
  console.log('SCU source inventory: ' + manifest.sources.length + ' source groups. No event publication.')
  for (const source of manifest.sources) {
    console.log('  ' + source.id + ' | ' + source.method + ' | ' + source.status)
  }
  if (fixture.length) {
    const file = fixture[0].slice('--fixture='.length)
    const result = inspectPayload(JSON.parse(await readFile(file, 'utf8')))
    console.log('OFFLINE synthetic fixture: ' + JSON.stringify(result))
    return
  }
  if (!args.includes('--probe-livewhale')) {
    console.log('OFFLINE ONLY: No requests or data writes. SCU API access and Qlusion feed remain unverified.')
    return
  }
  console.log('Read-only SCU LiveWhale API shape probe; no credentials, writes or imported records.')
  const response = await fetch(PROBE_URL, {
    method: 'GET', redirect: 'error',
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(12_000),
  })
  console.log('LiveWhale shape: ' + JSON.stringify(inspectPayload(await readLimited(response))))
  console.log('API schema still needs manual source, recurrence, time, venue and permission checks.')
}

if (process.argv[1]?.endsWith('audit-public-event-sources.mjs')) {
  audit().catch(error => {
    // Never expose external response bodies or provider credentials.
    console.error('SOURCE AUDIT FAILED: ' + (error instanceof Error ? error.message : 'Unknown error'))
    process.exitCode = 1
  })
}
