/**
 * Review or deliberately publish a human-verified SCU event batch.
 * No scraping, no Supabase secrets, and NO network call in default mode.
 *
 * From app/: node scripts/review-scu-events.mjs
 * Publishing is an explicit owner-approved action:
 *   node scripts/review-scu-events.mjs --limit=5 --apply --confirm-public-posting
 *
 * Reads the same-origin catalog server, checks existing records for duplicates,
 * and POSTs only records with a real future start/end interval. Re-running will
 * skip records previously created with an exact title/date/start match.
 */
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const file = new URL('../data/scu-events-review-2026-11-04.json', import.meta.url)
const allowedHosts = new Set(['www.scu.edu', 'scu.edu', 'events.scu.edu'])
const allowedTargetHosts = new Set(['127.0.0.1', 'localhost', '[::1]'])
const limits = { title: 80, hostName: 60, location: 120, description: 1000 }

function californiaNow() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date())
  const get = key => parts.find(part => part.type === key)?.value
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` }
}

function validDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  const actual = new Date(`${date}T00:00:00.000Z`)
  return Number.isFinite(actual.getTime()) && actual.toISOString().slice(0, 10) === date
}

function textField(value, max) {
  return typeof value === 'string' && /[\p{L}\p{N}]/u.test(value) && value.trim().length <= max
}

// A conservative duplicate warning, not a permanent external occurrence ID.
export function normalizeEventTitle(title) {
  return String(title).normalize('NFKD').toLowerCase()
    .replace(/(\p{Script=Latin})\p{M}+/gu, '$1').replace(/['’ʼ]/gu, '').replace(/&/gu, ' and ')
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, ' ').normalize('NFC').trim()
}
export function fingerprint(item) {
  const normalized = normalizeEventTitle(item.title)
  return `${normalized}|${item.date}|${item.start}`
}

function draftOf(item) {
  return {
    title: item.title.trim(), hostName: item.hostName.trim(), location: item.location.trim(),
    description: `${item.summary.trim()}\nSource: ${item.sourceUrl}`,
    date: item.date, start: item.start, end: item.end,
  }
}

async function loadBatch() {
  const { events } = JSON.parse(await readFile(file, 'utf8'))
  if (!Array.isArray(events) || events.length === 0 || events.length > 20) throw Error('Expected 1–20 reviewed events per batch.')
  const seen = new Set()
  for (const item of events) {
    const draft = draftOf(item)
    if (!textField(item.reviewId, 80) || !textField(item.summary, 1000) ||
        !['reviewed', 'hold'].includes(item.reviewState) ||
        (item.reviewState === 'hold' && !textField(item.sourceNote, 1000)) ||
        !textField(draft.title, limits.title) || !textField(draft.hostName, limits.hostName) ||
        !textField(draft.location, limits.location) || !textField(draft.description, limits.description) ||
        !validDate(draft.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.start) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.end) || draft.start >= draft.end) {
      throw Error(`Invalid event fields in ${item.reviewId ?? '(unnamed)'}.`)
    }
    let source
    try { source = new URL(item.sourceUrl) } catch { throw Error(`Missing source URL for ${item.reviewId}.`) }
    if (source.protocol !== 'https:' || !allowedHosts.has(source.hostname) || source.username || source.password || source.port) throw Error(`Unapproved source domain for ${item.reviewId}.`)
    const key = fingerprint(draft)
    if (seen.has(key)) throw Error(`Duplicate event inside review batch: ${item.reviewId}.`)
    seen.add(key)
  }
  return events
}

export async function api(target, route, options) {
  const response = await fetch(new URL(route, target), {
    ...options,
    redirect: 'error',
    headers: { Accept: 'application/json', ...options?.headers },
    signal: AbortSignal.timeout(15000),
  })
  let value
  try { value = await response.json() } catch { throw Error(`${route}: non-JSON HTTP ${response.status}.`) }
  if (!response.ok) throw Error(`${route}: HTTP ${response.status}: ${String(value?.error ?? 'Unknown error')}.`)
  return value
}

async function main() {
  const args = process.argv.slice(2)
  const limitArgs = args.filter(arg => arg.startsWith('--limit='))
  const asOfArgs = args.filter(arg => arg.startsWith('--as-of='))
  const asOf = asOfArgs[0]?.slice('--as-of='.length)
  const flags = args.filter(arg => !arg.startsWith('--limit=') && !arg.startsWith('--as-of='))
  const limited = limitArgs.length ? Number(limitArgs[0].slice('--limit='.length)) : null
  if (asOfArgs.length > 1 || (asOf !== undefined && (!/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/.test(asOf) || !validDate(asOf.slice(0, 10)))) ||
      limitArgs.length > 1 || (limited !== null && (!Number.isInteger(limited) || limited < 1 || limited > 20)) ||
      flags.some(arg => !['--apply', '--confirm-public-posting'].includes(arg)) || new Set(flags).size !== flags.length) {
    throw Error('Usage: node scripts/review-scu-events.mjs [--limit=1..20] [--as-of=YYYY-MM-DDTHH:mm (dry run only)] [--apply --confirm-public-posting]')
  }
  const apply = args.includes('--apply')
  if (apply !== args.includes('--confirm-public-posting')) {
    throw Error('Public posting requires BOTH --apply and --confirm-public-posting. Default review mode never writes.')
  }
  if (apply && asOf !== undefined) throw Error('A fixed review clock is for dry runs only; publishing uses the real California clock.')
  const events = await loadBatch()
  const now = asOf === undefined ? californiaNow() : { date: asOf.slice(0, 10), time: asOf.slice(11) }
  const held = events.filter(item => item.reviewState === 'hold')
  const eligible = events.filter(item => item.reviewState === 'reviewed')
  const future = eligible.filter(item => item.date > now.date || (item.date === now.date && item.start > now.time))
  const skippedPast = eligible.length - future.length
  const chosen = limited === null ? future : future.slice(0, limited)
  console.log(`Review batch: ${events.length} records; ${future.length} future; ${chosen.length} selected; ${skippedPast} past or already started; ${held.length} on hold (California time).`)
  for (const item of held) console.log(`  HOLD ${item.reviewId} | ${item.sourceNote}`)
  for (const item of chosen) console.log(`  ${item.reviewId} | ${item.date} ${item.start}–${item.end} | ${item.title} | ${item.sourceUrl}`)
  if (!apply) {
    console.log('\nDRY RUN: No API requests and no database writes. Check every source, venue and registration rule with the team before applying.')
    console.log('After team approval, try a pilot: node scripts/review-scu-events.mjs --limit=5 --apply --confirm-public-posting')
    return
  }
  if (chosen.length === 0) { console.log('No eligible future records; no API requests or database writes.'); return }
  const target = new URL(process.env.SIDEQUEST_IMPORT_TARGET || 'http://127.0.0.1:5173')
  if (target.protocol !== 'http:' || !allowedTargetHosts.has(target.hostname) || target.username || target.password || target.search || target.hash || target.pathname !== '/') {
    throw Error('Safety: publishing is allowed only against a local SideQuest development server (http://localhost or 127.0.0.1).')
  }
  const configuration = await api(target, '/api/catalog')
  if (configuration.shared !== true) throw Error('Shared catalog not configured. Refusing to seed browser-local data.')
  const existing = await api(target, '/api/events')
  if (!Array.isArray(existing)) throw Error('Could not confirm existing server event list; no writes attempted.')
  const seen = new Set(existing.map(fingerprint))
  let created = 0, duplicates = 0
  for (const item of chosen) {
    const draft = draftOf(item)
    const key = fingerprint(draft)
    if (seen.has(key)) { duplicates++; console.log(`SKIP duplicate: ${item.reviewId} ${item.title}`); continue }
    try {
      const posted = await api(target, '/api/events', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft),
      })
      if (!posted?.id) throw Error('No saved event ID returned; inspect Discover before retrying.')
      created++; seen.add(key)
      console.log(`POSTED ${item.reviewId}, event ID ${posted.id}`)
    } catch (error) {
      throw Error(`Stopped after ${created} successful posts; ${item.reviewId} failed: ${error.message}. Check Discover before rerunning; no automatic retry.`)
    }
  }
  console.log(`Complete: ${created} posted, ${duplicates} already present, ${skippedPast} past. Verify in a SECOND browser.`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(`ERROR: ${error.message}`); process.exitCode = 1 })
}
