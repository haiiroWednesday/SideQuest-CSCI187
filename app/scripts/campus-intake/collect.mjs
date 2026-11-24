// Bounded public-feed reader. No database keys, scraping, redirects, or writes.
// Provider access must be approved before any network request is made.
import { setTimeout as delay } from 'node:timers/promises'
import { normalizePage, reconcileRecords, campusParts } from './normalize.mjs'

const MAX_PAGES = 12
const MAX_PAGE_BYTES = 2_000_000
const MAX_RECORDS = 1000
const REQUEST_DELAY_MS = 1200
const TIMEOUT_MS = 15000

function checkedFeedUrl(value, source) {
  const configured = new URL(source.feed)
  const url = new URL(value, configured)
  if (configured.protocol !== 'https:' || configured.hostname !== 'events.scu.edu' ||
      configured.port || configured.username || configured.password ||
      configured.pathname !== '/live/json/v2/events/' ||
      url.origin !== configured.origin || url.username || url.password || url.hash ||
      !url.pathname.startsWith(configured.pathname)) {
    throw new Error('Unsafe or unexpected calendar feed URL')
  }
  return url
}

function requestUrl(source, now, horizonDays) {
  const today = campusParts(now).date
  const last = new Date(today + 'T12:00:00Z')
  last.setUTCDate(last.getUTCDate() + horizonDays)
  return checkedFeedUrl(source.feed + 'start_date/' + today + '/end_date/' +
    last.toISOString().slice(0, 10) + '/paginate/100/response_fields/group_title,location/', source)
}

async function readBoundedJson(response) {
  if (!response.ok) throw new Error('Provider HTTP ' + response.status)
  if (!(response.headers.get('content-type') ?? '').toLowerCase().includes('json')) {
    throw new Error('Provider did not return JSON')
  }
  const advertised = Number(response.headers.get('content-length'))
  if (advertised > MAX_PAGE_BYTES || !response.body) throw new Error('Provider response exceeds limit or has no body')
  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8', { fatal: true })
  let size = 0
  let body = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_PAGE_BYTES) throw new Error('Provider response exceeds limit')
      body += decoder.decode(value, { stream: true })
    }
    body += decoder.decode()
    return JSON.parse(body)
  } finally {
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}

export async function collectLiveWhale(source, {
  approvedRead = false, now = new Date(), horizonDays = 45,
  fetchImpl = globalThis.fetch, pause = delay,
} = {}) {
  if (!approvedRead) throw new Error('Provider read approval is required')
  if (source.id !== 'scu-livewhale' || source.adapter !== 'livewhale-v2') throw new Error('Unsupported source')
  if (!Number.isInteger(horizonDays) || horizonDays < 1 || horizonDays > 90) {
    throw new Error('Horizon must be between 1 and 90 days')
  }
  const checkedAt = now.toISOString()
  const seen = new Set()
  const rows = []
  const first = requestUrl(source, now, horizonDays)
  let next = first
  let expectedTotal = null
  let expectedPages = null
  while (next) {
    if (seen.size >= MAX_PAGES || seen.has(next.href)) throw new Error('Pagination limit or loop; no complete snapshot')
    if (seen.size) await pause(REQUEST_DELAY_MS)
    seen.add(next.href)
    const response = await fetchImpl(next.href, {
      method: 'GET', redirect: 'error', signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: 'application/json', 'User-Agent': 'SideQuest-CSCI187/0.1 (approved campus event intake)' },
    })
    const payload = await readBoundedJson(response)
    const meta = payload?.meta
    if (!meta || meta.type !== 'events' || !Number.isInteger(meta.total_results) ||
        meta.total_results < 0 || meta.total_results >= MAX_RECORDS ||
        !Number.isInteger(meta.total_pages) || meta.total_pages < 0 ||
        meta.total_pages > MAX_PAGES || meta.page !== seen.size || meta.per_page !== 100 ||
        meta.total_pages !== Math.ceil(meta.total_results / 100)) {
      throw new Error('Invalid pagination metadata or provider result cap reached; no complete snapshot')
    }
    if (expectedTotal === null) {
      expectedTotal = meta.total_results
      expectedPages = meta.total_pages
    } else if (meta.total_results !== expectedTotal || meta.total_pages !== expectedPages) {
      throw new Error('Pagination changed during collection; retry the complete snapshot')
    }
    const page = normalizePage(payload, source, checkedAt)
    if (page.records.length !== Math.min(100, Math.max(0, expectedTotal - rows.length))) {
      throw new Error('Provider page count does not match metadata')
    }
    if (Boolean(page.next) !== (seen.size < expectedPages)) throw new Error('Incomplete pagination links')
    rows.push(...page.records)
    if (rows.length > MAX_RECORDS) throw new Error('Record limit exceeded; no complete snapshot')
    next = page.next ? checkedFeedUrl(page.next, source) : null
    if (next && (next.pathname !== first.pathname || next.searchParams.size !== 1 ||
        next.searchParams.get('page') !== String(seen.size + 1))) {
      throw new Error('Unexpected pagination query; no complete snapshot')
    }
  }
  if (rows.length !== expectedTotal) throw new Error('Incomplete provider snapshot')
  const records = reconcileRecords(rows)
  return { version: 1, provider: source.id, checkedAt, horizonDays, complete: true,
    pages: seen.size, received: rows.length, records }
}
