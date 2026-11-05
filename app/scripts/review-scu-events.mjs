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

const file = new URL('../data/scu-events-review-2026-11-04.json', import.meta.url)
const allowedHosts = new Set(['www.scu.edu', 'scu.edu', 'events.scu.edu', 'santaclarabroncos.com', 'www.qlusion.com'])
const allowedTargetHosts = new Set(['127.0.0.1', 'localhost', '[::1]'])
const limits = { title: 120, hostName: 120, location: 200, description: 2000 }

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
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max
}

function fingerprint(item) {
  const normalized = String(item.title).normalize('NFKC').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
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
    if (!textField(item.reviewId, 80) || !textField(item.summary, 1600) ||
        !textField(draft.title, limits.title) || !textField(draft.hostName, limits.hostName) ||
        !textField(draft.location, limits.location) || !textField(draft.description, limits.description) ||
        !validDate(draft.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.start) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.end) || draft.start >= draft.end) {
      throw Error(`Invalid event fields in ${item.reviewId ?? '(unnamed)'}.`)
    }
    let source
    try { source = new URL(item.sourceUrl) } catch { throw Error(`Missing source URL for ${item.reviewId}.`) }
    if (source.protocol !== 'https:' || !allowedHosts.has(source.hostname)) throw Error(`Unapproved source domain for ${item.reviewId}.`)
    const key = fingerprint(draft)
    if (seen.has(key)) throw Error(`Duplicate event inside review batch: ${item.reviewId}.`)
    seen.add(key)
  }
  return events
}

async function api(target, route, options) {
  const response = await fetch(new URL(route, target), {
    ...options,
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
  const flags = args.filter(arg => !arg.startsWith('--limit='))
  const limited = limitArgs.length ? Number(limitArgs[0].slice('--limit='.length)) : null
  if (limitArgs.length > 1 || (limited !== null && (!Number.isInteger(limited) || limited < 1 || limited > 20)) ||
      flags.some(arg => !['--apply', '--confirm-public-posting'].includes(arg)) || new Set(flags).size !== flags.length) {
    throw Error('Usage: node scripts/review-scu-events.mjs [--limit=1..20] [--apply --confirm-public-posting]')
  }
  const apply = args.includes('--apply')
  if (apply !== args.includes('--confirm-public-posting')) {
    throw Error('Public posting requires BOTH --apply and --confirm-public-posting. Default review mode never writes.')
  }
  const events = await loadBatch()
  const now = californiaNow()
  const future = events.filter(item => item.date > now.date || (item.date === now.date && item.start > now.time))
  const skippedPast = events.length - future.length
  const chosen = limited === null ? future : future.slice(0, limited)
  console.log(`Review batch: ${events.length} records; ${future.length} future; ${chosen.length} selected; ${skippedPast} past or already started (California time).`)
  for (const item of chosen) console.log(`  ${item.reviewId} | ${item.date} ${item.start}–${item.end} | ${item.title} | ${item.sourceUrl}`)
  if (!apply) {
    console.log('\nDRY RUN: No API requests and no database writes. Check every source, venue and registration rule with the team before applying.')
    console.log('After team approval, try a pilot: node scripts/review-scu-events.mjs --limit=5 --apply --confirm-public-posting')
    return
  }
  const target = new URL(process.env.SIDEQUEST_IMPORT_TARGET || 'http://127.0.0.1:5173')
  if (target.protocol !== 'http:' || !allowedTargetHosts.has(target.hostname) || target.username || target.password || target.search || target.hash) {
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

main().catch(error => { console.error(`ERROR: ${error.message}`); process.exitCode = 1 })
