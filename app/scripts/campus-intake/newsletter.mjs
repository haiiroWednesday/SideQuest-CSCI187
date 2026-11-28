// Read-only newsletter source (SCU School of Engineering graduate weekly newsletter shape).
// Every value keeps the passage it came from, so a reviewer can check it against the email.
// Rows become review candidates. They never become public events by themselves.
//
// Current issues use nested event cards. Older samples use date tables and paragraphs.

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const MAX_BYTES = 1_000_000

function decode(text) {
  return text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#8211;|&ndash;/g, '–').replace(/&#8212;|&mdash;/g, '—')
    .replace(/&#8217;|&rsquo;/g, '’').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
}
function clean(html) { return decode(html.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim() }
function links(html) {
  const out = []
  for (const m of html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) out.push({ href: decode(m[1]), text: clean(m[2]) })
  return out
}

/** "4:00-5:30 p.m.", "1-3 p.m.", "10:00 a.m. to 3:00 p.m.", "10:45 a.m.-12:15 p.m.", "8:00 p.m." (no end). */
// A clock printed in an announcement is not necessarily its start time.
// Reject unclear starts rather than treating a registration deadline or door time as evidence.
export function parseTimeRange(text) {
  if (/\b(?:time|start(?:\s+time)?)\s*(?::\s*)?(?:is\s+)?(?:tba|tbd|to be announced|to be determined)\b/i.test(text)) return null
  for (const [, hour, minute] of text.matchAll(/\b(\d+):(\d*)/g)) {
    if (hour.length > 2 || +hour < 1 || +hour > 12 || minute.length !== 2 || +minute > 59) return null
  }

  const startLabel = /\b(?:starts?|begins?)\s*(?:at\s+|:\s*)/gi
  const labels = [...text.matchAll(startLabel)]
  if (labels.length > 1) return null
  const explicitlyStarting = labels.length === 1
  const auxiliary = /\b(?:doors?\s+open|check[- ]in|registration\s+(?:closes?|ends?|deadline)|register\s+by|rsvp\s+by|(?:application|submission)\s+deadline|deadline|due\s+by)\b/i
  if (!explicitlyStarting && auxiliary.test(text)) return null

  const timing = explicitlyStarting ? text.slice(labels[0].index + labels[0][0].length).trimStart() : text
  const parsed = parseClockRange(timing)
  if (!parsed || (explicitlyStarting && !timing.startsWith(parsed.passage))) return null
  const remaining = timing.slice(timing.indexOf(parsed.passage) + parsed.passage.length)
  // Multiple independent clock expressions are ambiguous; an explicit range is already consumed.
  if (/\b(?:noon|midnight|\d{1,2}(?::\d{2})?\s*[ap]\.?m\.?)\b/i.test(remaining)) return null
  return parsed
}

function parseClockRange(text) {
  // Match complete clock tokens, not substrings of malformed clocks. "Noon"
  // is explicit; midnight without a date boundary is held by the interval rules.
  const token = '(?<![\\d:])(?:\\bnoon\\b|\\bmidnight\\b|\\d{1,2}(?::\\d{2})?\\s*(?:a\\.?m\\.?|p\\.?m\\.?)?)(?![\\d:])'
  const range = new RegExp('(' + token + ')\\s*(?:-|–|—|\\bto\\b)\\s*(' + token + ')', 'gi')
  const single = new RegExp('(?<![\\d:])(?:\\bnoon\\b|\\bmidnight\\b|\\d{1,2}(?::\\d{2})?\\s*(?:a\\.?m\\.?|p\\.?m\\.?))(?![\\d:])', 'i')
  function clock(raw) {
    const t = raw.trim().toLowerCase()
    if (t === 'noon') return { hour: 12, minute: 0, mer: 'p' }
    if (t === 'midnight') return { hour: 12, minute: 0, mer: 'a' }
    const m = /^(\d{1,2})(?::(\d{2}))?\s*(?:([ap])\.?m\.?)?$/.exec(t)
    if (!m || +m[1] < 1 || +m[1] > 12 || +(m[2] ?? 0) > 59) return null
    return { hour: +m[1], minute: +(m[2] ?? 0), mer: m[3] ?? null }
  }
  const minutes = (c, mer) => c.hour % 12 * 60 + c.minute + (mer === 'p' ? 720 : 0)
  const format = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0')
  for (const m of text.matchAll(range)) {
    const a = clock(m[1]), b = clock(m[2])
    // A bare range (e.g. date 11-13) is not a clock. Fall through to an
    // explicitly marked range or start elsewhere in the sentence.
    if (a && b && (a.mer || b.mer)) {
      const options = []
      for (const am of a.mer ? [a.mer] : ['a','p']) for (const bm of b.mer ? [b.mer] : ['a','p']) {
        const x = minutes(a, am), y = minutes(b, bm)
        if (y > x) options.push([x,y])
      }
      options.sort((x,y) => (x[1]-x[0]) - (y[1]-y[0]))
      if (options.length) return { start: format(options[0][0]), end: format(options[0][1]), passage: m[0].trim() }
      return null
    }
    // An explicitly marked but invalid range must never fall back to its end.
    if (/[ap]\.?m\.?|noon|midnight/i.test(m[0])) return null
  }
  const s = single.exec(text)
  const c = s ? clock(s[0]) : null
  return c?.mer ? { start: format(minutes(c,c.mer)), end: null, passage: s[0].trim() } : null
}

function isoDate(monthName, day, issueDate) {
  const month = MONTHS.indexOf(monthName.slice(0, 3).toLowerCase())
  if (month < 0 || !(day >= 1 && day <= 31)) return null
  const issue = new Date(issueDate + 'T12:00:00Z')
  // The newsletter names no year: pick the one that puts the date nearest after the issue.
  for (const year of [issue.getUTCFullYear(), issue.getUTCFullYear() + 1]) {
    const date = new Date(Date.UTC(year, month, day, 12))
    if (date.getUTCMonth() !== month) return null
    const days = (date - issue) / 86400000
    if (days >= -45 && days <= 200) return date.toISOString().slice(0, 10)
  }
  return null
}

/** A link that names a LiveWhale event gives its provider ID: the only way a newsletter row joins a calendar row. */
export function liveWhaleIdFromLink(href) {
  try {
    const url = new URL(href)
    if (url.protocol !== 'https:' || url.hostname !== 'events.scu.edu') return null
    const m = /\/(?:event|live\/events)\/(\d{1,20})(?:[-/]|$)/.exec(url.pathname)
    return m ? m[1] : null
  } catch { return null }
}

function row(issue, part, fields) {
  const eventLinks = fields.links.map(l => l.href)
  const providerIds = [...new Set(eventLinks.map(liveWhaleIdFromLink).filter(Boolean))]
  return {
    source: 'scu-engineering-newsletter', issue: issue.code, issueUrl: issue.url, part,
    title: fields.title, date: fields.date, start: fields.time?.start ?? null, end: fields.time?.end ?? null,
    location: fields.location, speaker: fields.speaker,
    accessibility: fields.accessibility ?? null, contact: fields.contact ?? null, links: eventLinks,
    // More than one LiveWhale link in one entry is ambiguous: no automatic join.
    linkedProviderId: providerIds.length === 1 ? providerIds[0] : null,
    evidence: fields.evidence,
  }
}

/** SCU's Access Policy Statement, if the entry carries it: "In compliance with the ADA/504, please direct ... to NAME at EMAIL." */
export function accessFrom(text) {
  const m = /In compliance with the ADA\/504,[^.]*?\bto\s+(.+?)\s+at\s+([^\s]+@[^\s]+?|[()\d\s.-]{7,})\.?(?:\s|$)/i.exec(text)
  if (!m) return null
  return { statement: m[0].trim(), contact: m[1].trim() + ' (' + m[2].trim().replace(/\.$/, '') + ')' }
}

function speakerFrom(text) {
  const m = /(?:\bwith|\bfeaturing|\bspeaker:?|\bpresented by|\bhosted by)\s+((?:Dr\.\s+)?[A-Z][\w.'’-]+(?:\s+[A-Z][\w.'’-]+){0,3}(?:(?:\s+(?:from|of|at)\s+|,\s+)[A-Z][\w&'’ -]{1,60})?)/.exec(text)
  return m ? { value: m[1].replace(/[.,]$/, '').trim(), passage: m[0].trim() } : null
}

// Published issues put date and event fields in a nested presentation table.
// Limit links and evidence to the event cell, even in the final card before the footer.
function* calendarBlocks(section) {
  const cards = section.split(/<table\b[^>]*\bclass=["']cal-table["'][^>]*>/i)
  if (cards.length > 1) {
    for (const card of cards.slice(1)) {
      const eventCell = /<td\b[^>]*\bclass=["']cal-event-block["'][^>]*>([\s\S]*?)<\/td>/i.exec(card)?.[1]
      if (!eventCell) continue
      const month = /<div class="cal-date-month">([^<]+)<\/div>/i.exec(card)?.[1]?.trim()
      const day = /<div class="cal-date-day">(\d{1,2})<\/div>/i.exec(card)?.[1]
      const title = /<div class="cal-event-title">([\s\S]*?)<\/div>/i.exec(eventCell)
      if (!month || !day || !title || !clean(title[1])) continue
      const summaries = [...eventCell.matchAll(/<div class="cal-event-summary">([\s\S]*?)<\/div>/gi)]
      yield { cells: [month, day], paragraphs: [title, ...summaries].map(m => ({ text: clean(m[1]) })), after: eventCell }
    }
    return
  }
  for (const block of section.split(/(?=<table\b)/i).slice(1)) {
    const cells = [...block.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map(c => clean(c[1])).filter(Boolean)
    if (cells.length < 2 || !/^[A-Za-z]{3,9}\.?$/.test(cells[0]) || !/^\d{1,2}$/.test(cells[1])) continue
    const after = block.slice(block.search(/<\/table>/i) + 8)
    const paragraphs = [...after.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map(p => ({ text: clean(p[1]) })).filter(p => p.text)
    yield { cells, after, paragraphs }
  }
}

const EVENT_HEADING = /<h3\b[^>]*>\s*(?:<strong>\s*)?Upcoming Student Events\s*(?:<\/strong>\s*)?<\/h3>/i

function calendarRows(html, issue) {
  const at = html.search(EVENT_HEADING)
  if (at < 0) return []
  const out = []
  for (const { cells, after, paragraphs } of calendarBlocks(html.slice(at))) {
    if (!paragraphs.length) continue
    const [title, info, ...rest] = paragraphs
    const time = info ? parseTimeRange(info.text) : null
    const location = info && time ? (() => {
      const at = info.text.indexOf(time.passage)
      if (at < 0) return null
      const before = info.text.slice(0,at).match(/^(.*?)\s*[,|]\s*$/)?.[1]?.trim()
      const after = info.text.slice(at + time.passage.length).match(/^\s*[,|]\s*(.+)$/)?.[1]?.trim()
      return before || after || null
    })() : null
    // Per paragraph, so a sentence never runs into the next line's link text.
    const speaker = rest.map(p => speakerFrom(p.text)).find(Boolean) ?? null
    const access = rest.map(p => accessFrom(p.text)).find(Boolean) ?? null
    const date = isoDate(cells[0], Number(cells[1]), issue.published)
    out.push(row(issue, 'calendar', {
      title: title.text, date, time, location, speaker: speaker?.value ?? null,
      accessibility: access?.statement ?? null, contact: access?.contact ?? null,
      links: links(after.split(/<h[1-3]\b|<hr\b/i)[0]),
      evidence: {
        title: title.text, date: cells[0] + ' ' + cells[1], start: time?.passage ?? null, end: time?.end ? time.passage : null,
        location: location ? info.text : null, speaker: speaker?.passage ?? null,
        accessibility: access?.statement ?? null, contact: access?.statement ?? null,
      },
    }))
  }
  return out
}

/** Announcement tables: bold title, then a paragraph with the date, time, place and speaker in prose. */
function announcementRows(html, issue) {
  const end = html.search(EVENT_HEADING)
  const body = end < 0 ? html : html.slice(0, end)
  const out = []
  for (const cell of body.matchAll(/<td[^>]*>\s*<(?:strong|b)>([\s\S]*?)<\/(?:strong|b)>\s*(?:<br\s*\/?>)?([\s\S]*?)<\/td>/gi)) {
    const title = clean(cell[1]).replace(/:$/, '')
    const prose = clean(cell[2])
    const dateMatch = /\b(?:(?:this|next)\s+)?(?:Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day,\s+([A-Z][a-z]+)\.?\s+(\d{1,2})\b/.exec(prose)
    if (!title || !dateMatch) continue
    const time = parseTimeRange(prose)
    const place = /\b(?:in|at)\s+(?:the\s+)?([A-Z][\w&'’-]*(?:\s+[A-Z0-9][\w&'’-]*){0,5})/.exec(prose.slice(dateMatch.index))
    const speaker = speakerFrom(prose)
    out.push(row(issue, 'announcement', {
      title, date: isoDate(dateMatch[1], Number(dateMatch[2]), issue.published), time,
      location: place ? place[1] : null, speaker: speaker?.value ?? null, links: links(cell[2]),
      evidence: {
        title, date: dateMatch[0], start: time?.passage ?? null, end: time?.end ? time.passage : null,
        location: place ? place[0] : null, speaker: speaker?.passage ?? null,
      },
    }))
  }
  return out
}

export function parseEngineeringNewsletter(html, issue) {
  if (typeof html !== 'string' || html.length > MAX_BYTES) throw new Error('Newsletter missing or too large')
  if (!issue || !/^\d{4}-\d\d-\d\d$/.test(issue.published) || !issue.code) throw new Error('Issue code and publish date are required')
  return [...announcementRows(html, issue), ...calendarRows(html, issue)]
}
