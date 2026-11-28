// Independent public source readers. No publication or database access.
import { normalizeOrganizerExport } from './organizerExport.mjs'
import { parseEngineeringNewsletter } from './newsletter.mjs'

const INDEX = 'https://www.scu.edu/engineering/current-student-resources/current-graduate-students/'
const ISSUE_PATH = '/email/engineering/graduate-programs/weekly-newsletters/'
const MAX_BYTES = 1_000_000
const MAX_ISSUES = 4

function publicUrl(value, origin) {
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.origin !== origin || url.username || url.password ||
      url.search || url.hash) throw new Error('Unsafe or non-public feed URL')
  return url.href
}

async function readPublic(url, mime, fetchImpl) {
  const response = await fetchImpl(url, { redirect: 'error', signal: AbortSignal.timeout(12_000),
    headers: { Accept: mime } })
  if (!response.ok || !(response.headers.get('content-type') ?? '').toLowerCase().includes(mime) ||
      !response.body || Number(response.headers.get('content-length')) > MAX_BYTES) {
    await response.body?.cancel().catch(() => {})
    throw new Error('Unavailable or invalid source response')
  }
  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8', { fatal: true })
  let text = '', bytes = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      bytes += value.byteLength
      if (bytes > MAX_BYTES) throw new Error('Source response too large')
      text += decoder.decode(value, { stream: true })
    }
    return text + decoder.decode()
  } finally {
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}

// Issue code supplies a term/year reference, not a claim about the publication date.
// Restrict to fall/winter/spring/summer issues explicitly linked by the school.
export function discoverNewsletterIssues(html) {
  const found = new Map()
  for (const m of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["']/gi)) {
    let url
    try { url = new URL(m[1], INDEX) } catch { continue }
    const match = /^([fwspu])(\d{2})-?w(\d{1,2})\/?$/i.exec(url.pathname.slice(ISSUE_PATH.length))
    if (url.origin !== new URL(INDEX).origin || !url.pathname.startsWith(ISSUE_PATH) ||
        url.search || url.hash || url.username || url.password || !match) continue
    const year = 2000 + Number(match[2]), week = Number(match[3])
    const month = { f: 9, w: 1, s: 4, p: 4, u: 6 }[match[1].toLowerCase()]
    if (week < 1 || week > 15) continue
    const dateAnchor = new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10)
    const code = match[1].toLowerCase() + match[2] + 'w' + week
    found.set(code, { code, url: url.href, dateAnchor, week })
  }
  return [...found.values()].sort((a,b) => b.dateAnchor.localeCompare(a.dateAnchor) || b.week - a.week).slice(0, MAX_ISSUES)
}

function validStart(value) {
  return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)
}

export async function collectEngineeringNewsletters({ approvedRead = false, fetchImpl = globalThis.fetch, now = new Date() } = {}) {
  if (!approvedRead) throw new Error('Newsletter read approval is required')
  const issues = discoverNewsletterIssues(await readPublic(INDEX, 'text/html', fetchImpl))
  if (!issues.length) throw new Error('No supported newsletter issue links; layout or source changed')
  const today = new Intl.DateTimeFormat('en-CA', {timeZone:'America/Los_Angeles', year:'numeric', month:'2-digit', day:'2-digit'}).format(now)
  const records = [], failures = []
  for (const issue of issues) {
    try {
      const html = await readPublic(issue.url, 'text/html', fetchImpl)
      const rows = parseEngineeringNewsletter(html, { ...issue, published: issue.dateAnchor })
      if (!rows.length) throw new Error('No recognized event rows; review issue layout')
      records.push(...rows.filter(row => row.date && row.date >= today && validStart(row.start))
        .map(row => ({ ...row, checkedAt: now.toISOString(), dateAnchor: issue.dateAnchor,
          reviewState: 'awaiting-review' })))
    } catch (error) { failures.push({ issue: issue.code, error: error.message }) }
  }
  return { provider: 'scu-engineering-newsletter', checkedAt: now.toISOString(),
    complete: failures.length === 0, issues: issues.map(i => i.code), failures, records }
}

// Qlusion and other organizers can provide a compatible authorized public JSON feed.
// This is a transport for the existing neutral export contract, not a guessed native API.
export async function collectOrganizerFeed(source, url, {
  approvedRead = false, fetchImpl = globalThis.fetch, now = new Date(),
} = {}) {
  if (!approvedRead) throw new Error('Organizer feed approval is required')
  const feed = publicUrl(url, new URL(source.page).origin)
  const payload = JSON.parse(await readPublic(feed, 'application/json', fetchImpl))
  const snapshot = normalizeOrganizerExport(payload, source, { approvedExport: true, now })
  const records = snapshot.records.filter(row => validStart(row.start))
  return { ...snapshot, records, excludedMissingStart: snapshot.records.length - records.length }
}
