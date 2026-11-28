// SCU Presents publishes a distinct public ticket page for every dance showtime.
// A page URL locates evidence; a reviewer still has to establish catalog identity.
import { campusParts } from './normalize.mjs'
import { readPublic } from './independentSources.mjs'

const INDEX = 'https://scupresents.scu.edu/section/test-3-1h2q'
const ORIGIN = new URL(INDEX).origin

function timestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(value)) return null
  const date = new Date(value)
  return Number.isFinite(+date) && date.toISOString() === value.replace(/(\d\d:\d\d:\d\d)Z$/, '$1.000Z') ? date : null
}

export async function collectScuPresents({ approvedRead = false, now = new Date(), fetchImpl = fetch } = {}) {
  if (!approvedRead) throw new Error('SCU Presents read approval required')
  const index = await readPublic(INDEX, 'text/html', fetchImpl)
  const pages = new Set()
  for (const anchor of index.matchAll(/<a\b[^>]*>/gi)) {
    if (!/\bclass="other-event-box-link"/i.test(anchor[0])) continue
    const path = /\bhref="(\/event\/[a-z0-9-]+)"/i.exec(anchor[0])?.[1]
    if (!path) throw new Error('Unrecognized SCU Presents event link')
    pages.add(ORIGIN + path)
  }
  if (!pages.size || pages.size > 20) throw new Error('Unexpected SCU Presents listing size')
  const records = [], failures = []
  let excludedMissingStart = 0
  for (const sourceUrl of pages) {
    try {
      const html = await readPublic(sourceUrl, 'text/html', fetchImpl)
      const matches = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)]
        .map(m => JSON.parse(m[1])).filter(item => item?.['@type'] === 'Event' && item.url === sourceUrl)
      if (matches.length !== 1) throw new Error('Expected one matching event on ticket page')
      const [event] = matches
      if (event.eventStatus !== 'https://schema.org/EventScheduled' ||
          event.eventAttendanceMode !== 'https://schema.org/OfflineEventAttendanceMode') continue
      const start = timestamp(event.startDate)
      if (!start) { excludedMissingStart++; continue }
      if (start <= now || +start >= +now + 45 * 86400000) continue
      const local = campusParts(start), end = timestamp(event.endDate)
      const endLocal = end && end > start ? campusParts(end) : null
      records.push({ source:'scu-presents-dance', sourceUrl, checkedAt:now.toISOString(),
        title:typeof event.name === 'string' ? event.name.trim() : null, location:event.location?.name ?? null,
        date:local.date, start:local.time, end:endLocal?.date === local.date ? endLocal.time : null,
        evidence:{ startDate:event.startDate, endDate:event.endDate ?? null },
        reviewState:'held', reasons:['verify-performance-end','source-identity-review'] })
    } catch (error) { failures.push({ sourceUrl, error:error.message }) }
  }
  return { provider:'scu-presents-dance', checkedAt:now.toISOString(), complete:failures.length === 0,
    pages:pages.size, excludedMissingStart, failures, records }
}
