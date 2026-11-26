// CONTROLLER: the three ways busy time comes in from outside, behind one BusySource port.
//   a calendar file (.ics)   -> read on this device, never uploaded
//   a typed or spoken line   -> AI on our server when it is set up, else read on this device
//   Google Calendar          -> server import (googleClient), turned into the same proposals
// Whatever the source, the student sees one list and ticks what to keep before anything changes.
import { checkProposals, rangeOfDays, type BusyImport, type BusyProposal, type BusyRange } from '../model/busyImport'
import { MAX_ICS_BYTES, readIcs } from '../model/icsBusy'
import { MAX_SENTENCE, readSentence } from '../model/busySentence'
import { clockSpan, toMinutes } from '../model/events'

export type { BusyProposal } from '../model/busyImport'
export type BusyHelp = BusyImport & { via: 'ai' | 'device' | 'file' | 'google'; note: string | null }

export const BUSY_DAYS = 7
export const weekFrom = (today: string): BusyRange => rangeOfDays(today, BUSY_DAYS)

export async function busyFromFile(file: Pick<File, 'size' | 'text' | 'name'>, today: string): Promise<BusyHelp> {
  if (!/\.(ics|ical|ifb|icalendar)$/i.test(file.name)) return { proposals: [], unclear: ['Pick a calendar file that ends in .ics.'], via: 'file', note: null }
  if (file.size > MAX_ICS_BYTES) return { proposals: [], unclear: ['That file is too big. Export just this term or this month.'], via: 'file', note: null }
  const read = readIcs(await file.text(), weekFrom(today))
  return { ...read, via: 'file', note: read.proposals.length ? null : read.unclear.length ? null : 'Nothing busy in that file in the next 7 days.' }
}

/** A sentence. Tries the server's AI when `useAi`; any failure falls back to the reader on this device. */
export async function busyFromWords(text: string, today: string, useAi: boolean, fetcher: typeof fetch = fetch): Promise<BusyHelp> {
  const words = text.trim().slice(0, MAX_SENTENCE)
  const range = weekFrom(today)
  const local = (note: string | null): BusyHelp => ({ ...readSentence(words, range), via: 'device', note })
  if (!useAi || words.length < 3) return local(null)
  try {
    const res = await fetcher('/api/ai/busy', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: words }), signal: AbortSignal.timeout(12_000) })
    if (!res.ok) return local('AI help is off right now, so this was read on your device.')
    const value = await res.json() as { proposals?: unknown; unclear?: unknown }
    const proposals = checkProposals(Array.isArray(value.proposals) ? value.proposals : [], range)
    const unclear = Array.isArray(value.unclear) ? value.unclear.filter((q): q is string => typeof q === 'string').slice(0, 4) : []
    return { proposals, unclear, via: 'ai', note: 'Read by AI. Check each time before you add it.' }
  } catch {
    return local('AI help could not be reached, so this was read on your device.')
  }
}

/** Google's busy blocks as proposals, so they go through the same list. */
export function busyFromGoogle(blocks: readonly { date: string; start: string; end: string }[], today: string): BusyHelp {
  const proposals = checkProposals(blocks.map(b => ({ ...b, label: 'From Google', source: 'google', suggested: true })), weekFrom(today))
  return { proposals, unclear: [], via: 'google', note: null }
}

/** The ones the student kept, ready for addBusyBlocks. */
export const kept = (list: readonly BusyProposal[], ticked: ReadonlySet<number>) =>
  list.filter((_, i) => ticked.has(i)).map(({ date, start, end }) => ({ date, start, end }))

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
/** "Wed 25" and "10–11am" for one row of the confirm list. */
export function proposalWhen(p: Pick<BusyProposal, 'date' | 'start' | 'end'>): { day: string; time: string } {
  const d = new Date(p.date + 'T12:00:00Z')
  return { day: `${DOW[d.getUTCDay()]} ${d.getUTCDate()}`, time: clockSpan(toMinutes(p.start) ?? 0, toMinutes(p.end) ?? 0) }
}
