// Instagram as a lead source for club events. No scraping: no network, no login.
// Intake is a post URL plus its caption, pasted by a reviewer or submitted by the organizer,
// with optional flyer image references. Every value keeps the caption passage (or image) it came from.
//
// What a lead can become (Cyn, Nov 24, 2026):
// - the organizer's own post (or the organizer confirming) gives date, start, end and venue → can reach Discover;
// - date known, time missing → organizer review queue; may be listed in Browse as "Time TBA", never in free-time matches;
// - date unclear → held until the organizer confirms it.
import { parseTimeRange, liveWhaleIdFromLink, accessFrom } from './newsletter.mjs'

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const MAX_CAPTION = 2200 // Instagram's own caption limit

export function instagramPostUrl(value) {
  try {
    const url = new URL(value)
    const m = /^\/(p|reel)\/([A-Za-z0-9_-]{5,40})\/?$/.exec(url.pathname)
    if (url.protocol !== 'https:' || !['www.instagram.com', 'instagram.com'].includes(url.hostname) || !m) return null
    return 'https://www.instagram.com/' + m[1] + '/' + m[2] + '/'
  } catch { return null }
}
export function instagramHandle(value) {
  const h = typeof value === 'string' ? value.trim().replace(/^@/, '').toLowerCase() : ''
  return /^[a-z0-9._]{1,30}$/.test(h) ? h : null
}

/** "Fri, Nov 20", "November 20", "11/20". Relative words ("tonight", "this Friday") are not a date. */
function dateFrom(caption, postedOn) {
  const posted = new Date(postedOn + 'T12:00:00Z')
  const named = /\b(?:(?:mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)[a-z]*\.?,?\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/i.exec(caption)
  const numeric = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/.exec(caption)
  let month, day, passage
  if (named) { month = MONTHS.indexOf(named[1].slice(0, 3).toLowerCase()); day = Number(named[2]); passage = named[0] }
  else if (numeric && !numeric[3]) { month = Number(numeric[1]) - 1; day = Number(numeric[2]); passage = numeric[0] }
  else return null
  if (!Number.isFinite(posted.getTime())) return null
  for (const year of [posted.getUTCFullYear(), posted.getUTCFullYear() + 1]) {
    const d = new Date(Date.UTC(year, month, day, 12))
    if (d.getUTCMonth() !== month || d.getUTCDate() !== day) return null
    const days = (d - posted) / 86400000
    if (days >= -2 && days <= 180) return { value: d.toISOString().slice(0, 10), passage }
  }
  return null
}

function venueFrom(caption) {
  const m = /(?:📍\s*|\b(?:location|where|venue|place)\s*[:\-–]\s*)([^\n|•]{2,80})/i.exec(caption)
  return m ? { value: m[1].trim().replace(/[.!]+$/, ''), passage: m[0].trim() } : null
}

/**
 * lead: { postUrl, handle, caption, postedOn: 'YYYY-MM-DD', imageRefs?, submittedBy: 'reviewer' | 'organizer' }
 * organizers: Map or object of verified club handles → { name }.
 * Returns a row shaped like a newsletter row so the same review queue handles it.
 */
export function parseInstagramLead(lead, organizers = {}) {
  const postUrl = instagramPostUrl(lead?.postUrl)
  const handle = instagramHandle(lead?.handle)
  if (!postUrl || !handle) throw new Error('An Instagram post URL and the posting account are required')
  if (typeof lead.caption !== 'string' || !lead.caption.trim() || lead.caption.length > MAX_CAPTION) throw new Error('Paste the post caption')
  if (!/^\d{4}-\d\d-\d\d$/.test(lead.postedOn ?? '')) throw new Error('The date the post went up is required')
  const caption = lead.caption.normalize('NFKC')
  const lines = caption.split('\n').map(l => l.trim()).filter(Boolean)
  const title = lines[0].replace(/^[^\p{L}\p{N}]+/u, '').replace(/[^\p{L}\p{N})!?]+$/u, '') || null
  const date = dateFrom(caption, lead.postedOn)
  const time = parseTimeRange(caption)
  const venue = venueFrom(caption)
  const access = accessFrom(caption.replace(/\n/g, ' '))
  const registry = organizers instanceof Map ? organizers : new Map(Object.entries(organizers))
  const organizer = registry.get(handle) ?? null
  const links = [...caption.matchAll(/https:\/\/\S+/g)].map(m => m[0].replace(/[).,]+$/, ''))
  const providerIds = [...new Set(links.map(liveWhaleIdFromLink).filter(Boolean))]
  return {
    source: 'instagram', issue: '@' + handle, part: 'instagram', postUrl, handle,
    organizerPost: Boolean(organizer), organizerName: organizer?.name ?? null,
    submittedBy: lead.submittedBy === 'organizer' ? 'organizer' : 'reviewer',
    title, date: date?.value ?? null, start: time?.start ?? null, end: time?.end ?? null,
    location: venue?.value ?? null, speaker: null,
    accessibility: access?.statement ?? null, contact: access?.contact ?? null,
    links, linkedProviderId: providerIds.length === 1 ? providerIds[0] : null,
    imageRefs: Array.isArray(lead.imageRefs) ? lead.imageRefs.filter(r => typeof r === 'string') : [],
    evidence: {
      title: lines[0], date: date?.passage ?? null, start: time?.passage ?? null, end: time?.end ? time.passage : null,
      location: venue?.passage ?? null, accessibility: access?.statement ?? null, contact: access?.statement ?? null,
    },
  }
}
