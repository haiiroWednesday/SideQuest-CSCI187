// MODEL: busy time from a sentence ("class MWF ten to eleven, work Tuesday from two to five").
// This is the deterministic adapter of the BusySource port. It runs in the browser with no
// network, so it works without an AI key, and it is also the yardstick the AI adapter's
// output is checked against (both pass checkProposals). It never guesses a missing time:
// a day with no time, or a start with no end, comes back in `unclear` as a question.
import { checkProposals, type BusyImport, type BusyProposal, type BusyRange, type BusySource } from './busyImport'
import { hhmmOf } from './events'

export const MAX_SENTENCE = 400

const DAY_WORDS: Record<string, number[]> = {
  sunday: [0], sundays: [0], sun: [0],
  monday: [1], mondays: [1], mon: [1],
  tuesday: [2], tuesdays: [2], tue: [2], tues: [2],
  wednesday: [3], wednesdays: [3], wed: [3],
  thursday: [4], thursdays: [4], thu: [4], thur: [4], thurs: [4],
  friday: [5], fridays: [5], fri: [5],
  saturday: [6], saturdays: [6], sat: [6],
  weekdays: [1, 2, 3, 4, 5], weekday: [1, 2, 3, 4, 5], weekends: [0, 6], weekend: [0, 6],
  mwf: [1, 3, 5], mw: [1, 3], wf: [3, 5], tth: [2, 4], tr: [2, 4], tuth: [2, 4], tuthu: [2, 4], mtwrf: [1, 2, 3, 4, 5],
}
const PARTS: Record<string, [number, number]> = {
  morning: [8 * 60, 12 * 60], mornings: [8 * 60, 12 * 60],
  afternoon: [12 * 60, 17 * 60], afternoons: [12 * 60, 17 * 60],
  evening: [17 * 60, 21 * 60], evenings: [17 * 60, 21 * 60],
  night: [18 * 60, 23 * 60], nights: [18 * 60, 23 * 60], tonight: [18 * 60, 23 * 60],
  lunch: [12 * 60, 13 * 60], 'all day': [8 * 60, 23 * 60],
}
const NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
}
const FILLER = new Set(['i', "i'm", 'im', 'am', 'is', 'are', 'have', 'has', 'busy', 'on', 'at', 'from', 'to', 'until', 'til', 'till', 'and', 'every',
  'the', 'a', 'an', 'my', 'in', 'each', 'also', 'then', 'with', 'for', 'got', 'this', 'next', 'pm', 'am', 'p.m.', 'a.m.', 'oclock', "o'clock", 'between',
  'through', 'thru', 'all', 'day', 'days', 'week', 'today', 'tomorrow', 'and,', 'there', "there's", 'plus', 'do', 'go', 'be', 'will', 'from,'])

type Tok =
  | { k: 'days'; days: number[]; next: boolean }
  | { k: 'date'; offset: number }
  | { k: 'time'; from: number; to: number | null; explicit: boolean; raw: string }
  | { k: 'word'; w: string }
  | { k: 'stop' }
  | { k: 'comma' }

/** One clock word or number: "10", "10:30", "10am", "ten", "ten thirty", "noon". Minutes after midnight, plus whether am/pm was said. */
function clockAt(words: string[], i: number): { min: number; used: number; said: 'am' | 'pm' | null } | null {
  const w = words[i]
  if (w === 'noon') return { min: 12 * 60, used: 1, said: 'pm' }
  if (w === 'midnight') return { min: 23 * 60 + 59, used: 1, said: 'pm' }
  let m = /^(\d{1,2})(?::(\d{2}))?(am|pm|a\.m\.|p\.m\.)?$/.exec(w)
  let hour: number | null = null, minute = 0, used = 1, said: 'am' | 'pm' | null = null
  if (m) { hour = +m[1]; minute = m[2] ? +m[2] : 0; if (m[3]) said = m[3].startsWith('a') ? 'am' : 'pm' }
  else if (NUMBERS[w] !== undefined) {
    hour = NUMBERS[w]
    const next = words[i + 1]
    if (next === 'thirty') { minute = 30; used = 2 } else if (next === 'fifteen') { minute = 15; used = 2 } else if (next === 'forty-five') { minute = 45; used = 2 }
  }
  if (hour === null || hour > 23 || minute > 59) return null
  const after = words[i + used]
  if (!said && (after === 'am' || after === 'a.m.')) { said = 'am'; used++ }
  else if (!said && (after === 'pm' || after === 'p.m.')) { said = 'pm'; used++ }
  if (said === 'pm' && hour < 12) hour += 12
  if (said === 'am' && hour === 12) hour = 0
  return { min: hour * 60 + minute, used, said }
}

/** Campus hours without am/pm: 8 to 11 are morning, 12 is noon, 1 to 7 are afternoon or evening. */
function settle(min: number, said: 'am' | 'pm' | null): number {
  if (said || min >= 13 * 60) return min
  return min < 8 * 60 ? min + 12 * 60 : min
}

function tokenize(text: string): Tok[] {
  const words = text.toLowerCase().replace(/[–—]/g, '-').replace(/(\d)\s*-\s*(\d)/g, '$1 to $2')
    .replace(/(\d)(am|pm)\s*-\s*/g, '$1$2 to ').replace(/[.;!?]+(\s|$)/g, ' . ').replace(/,/g, ' , ').split(/\s+/).filter(Boolean)
  const out: Tok[] = []
  for (let i = 0; i < words.length; i++) {
    const w = words[i]
    if (w === '.') { out.push({ k: 'stop' }); continue }
    if (w === ',') { out.push({ k: 'comma' }); continue }
    if (w === 'all' && words[i + 1] === 'day') { out.push({ k: 'time', from: PARTS['all day'][0], to: PARTS['all day'][1], explicit: false, raw: 'all day' }); i++; continue }
    if (w === 'today' || w === 'tonight') { out.push({ k: 'date', offset: 0 }); if (w === 'tonight') out.push({ k: 'time', from: PARTS.tonight[0], to: PARTS.tonight[1], explicit: false, raw: 'tonight' }); continue }
    if (w === 'tomorrow') { out.push({ k: 'date', offset: 1 }); continue }
    if (DAY_WORDS[w]) { out.push({ k: 'days', days: DAY_WORDS[w], next: words[i - 1] === 'next' }); continue }
    if (PARTS[w]) { out.push({ k: 'time', from: PARTS[w][0], to: PARTS[w][1], explicit: false, raw: w }); continue }
    const a = clockAt(words, i)
    if (a) {
      let j = i + a.used
      const link = words[j]
      if (link === 'to' || link === 'until' || link === 'til' || link === 'till' || link === '-' || link === 'and' || link === 'through') {
        const b = clockAt(words, j + 1)
        if (b) {
          let from = a.min, to = b.min
          // "10 to 1" is 10am to 1pm; "2 to 5" is 2pm to 5pm; "11am to 1" ends at 1pm.
          if (!a.said && b.said) {
            // "7-8am", "1 to 3pm": the start takes the end's am or pm when that keeps it before the end.
            const borrowed = b.said === 'pm' && a.min < 12 * 60 ? a.min + 12 * 60 : b.said === 'am' && a.min === 12 * 60 ? 0 : a.min
            from = borrowed < b.min ? borrowed : settle(a.min, null)
          } else from = settle(from, a.said)
          to = settle(to, b.said)
          if (to <= from && to + 12 * 60 <= 23 * 60 + 59 && !b.said) to += 12 * 60
          out.push({ k: 'time', from, to, explicit: true, raw: words.slice(i, j + 1 + b.used).join(' ') })
          i = j + b.used
          continue
        }
      }
      // A lone number only counts as a time after "at" or with am/pm; otherwise it is just a word ("CSCI 187").
      if (a.said || words[i - 1] === 'at') {
        out.push({ k: 'time', from: settle(a.min, a.said), to: null, explicit: true, raw: words.slice(i, j).join(' ') })
        i = j - 1
        continue
      }
    }
    out.push({ k: 'word', w })
  }
  return out
}

const DOW_NAME = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const dayOf = (date: string) => new Date(date + 'T12:00:00Z').getUTCDay()
const plus = (date: string, n: number) => { const d = new Date(date + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }

/** The dates in `range` a group of day words names. "next Friday" is the Friday of next week. */
function datesFor(t: Extract<Tok, { k: 'days' }> | Extract<Tok, { k: 'date' }>, range: BusyRange): string[] {
  if (t.k === 'date') { const d = plus(range.from, t.offset); return d <= range.to ? [d] : [] }
  const out: string[] = []
  const todayDow = dayOf(range.from)
  const daysToMonday = ((8 - todayDow) % 7) || 7
  for (const dow of t.days) {
    if (t.next) { const d = plus(range.from, daysToMonday + ((dow + 6) % 7)); if (d <= range.to) out.push(d); continue }
    for (let d = range.from; d <= range.to; d = plus(d, 1)) if (dayOf(d) === dow) out.push(d)
  }
  return out.sort()
}

type Clause = { days: (Extract<Tok, { k: 'days' }> | Extract<Tok, { k: 'date' }>)[]; time: Extract<Tok, { k: 'time' }> | null; words: string[]; sealed: boolean; carried: string }

export function readSentence(text: string, range: BusyRange): BusyImport {
  const clean = text.trim().slice(0, MAX_SENTENCE)
  if (!clean) return { proposals: [], unclear: [] }
  const proposals: BusyProposal[] = []
  const unclear: string[] = []
  const fresh = (): Clause => ({ days: [], time: null, words: [], sealed: false, carried: '' })
  // Words keep the case they were typed in ("CSCI 187", not "csci"). A number stays when it follows a kept word.
  const asTyped = (w: string) => clean.match(new RegExp(`(?<![\\w'])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w'])`, 'i'))?.[0] ?? w
  const labelOf = (c: Clause) => {
    const kept: string[] = []
    c.words.forEach((x, i) => {
      if (FILLER.has(x)) return
      if (/^\d+$/.test(x) ? kept.length > 0 && c.words[i - 1] && !FILLER.has(c.words[i - 1]) : x.length > 1) kept.push(asTyped(x))
    })
    const name = kept.join(' ').slice(0, 40) || c.carried
    return name ? name[0].toUpperCase() + name.slice(1) : ''
  }
  const complete = (c: Clause) => c.days.length > 0 && c.time !== null
  let c = fresh()
  let last = null as Clause | null
  const close = () => {
    const name = labelOf(c)
    if (complete(c)) {
      const time = c.time!
      if (time.to === null) unclear.push(`How long${name ? ` is ${name.toLowerCase()}` : ''} at ${time.raw}? Say when it ends, like "${time.raw} to ${hhmmOf(Math.min(time.from + 60, 23 * 60))}".`)
      else if (time.to <= time.from) unclear.push(`"${time.raw}" ends before it starts.`)
      else {
        const dates = [...new Set(c.days.flatMap(d => datesFor(d, range)))]
        if (!dates.length && c.days.some(d => d.k === 'days' && d.next)) unclear.push('That day is more than a week away. SideQuest plans 7 days ahead.')
        for (const date of dates) proposals.push({ date, start: hhmmOf(time.from), end: hhmmOf(time.to), label: name || 'Busy', source: 'sentence', suggested: true })
      }
      last = c
    } else if (c.days.length) {
      const names = [...new Set(c.days.flatMap(d => d.k === 'days' ? d.days.map(n => DOW_NAME[n]) : [d.offset === 0 ? 'today' : 'tomorrow']))]
      unclear.push(`What time${name ? ` is ${name.toLowerCase()}` : ''} on ${names.join(', ')}?`)
    } else if (c.time) {
      unclear.push(`Which day${name ? ` is ${name.toLowerCase()}` : ''} at ${c.time.raw}?`)
    }
    c = fresh()
  }
  for (const t of tokenize(clean)) {
    if (t.k === 'stop') { close(); last = null; continue }
    if (t.k === 'comma') { if (complete(c)) c.sealed = true; continue }
    if (t.k === 'word') { if (c.sealed) close(); c.words.push(t.w); continue }
    if (t.k === 'days' || t.k === 'date') { if (complete(c)) close(); c.days.push(t); continue }
    // a time
    if (complete(c) || (c.time && !c.days.length)) {
      // "Mondays 10 to 11 and 2 to 3": a second time for the same days and the same activity.
      const keep = complete(c) ? c : null
      close()
      if (keep && !c.words.length) { c.days = [...keep.days]; c.carried = labelOf(keep) }
    } else if (!c.days.length && !c.words.some(w => !FILLER.has(w)) && last) {
      c.days = [...last.days]; c.carried = labelOf(last)
    }
    c.time = t
  }
  close()
  return { proposals: checkProposals(proposals, range), unclear: [...new Set(unclear)] }
}

export const sentenceSource: BusySource<string> = { kind: 'sentence', read: readSentence }
