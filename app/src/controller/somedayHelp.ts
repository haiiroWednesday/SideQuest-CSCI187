// CONTROLLER: "Talk to Someday". A sentence about something you'd like to do becomes a card you
// can edit before saving, with real campus events that would let you do it.
// The server's AI writes the title and picks events when it is set up; otherwise this device does
// it with plain word matching. Either way every suggested event must exist in the catalog the
// student is looking at, and nothing is saved until "Save the idea".
import { MAX_IDEA_NOTE, MAX_IDEA_TITLE } from '../model/someday'
import { clockSpan, toMinutes } from '../model/events'

export type SomedayMatchEvent = { id: string; title: string; description: string; date: string; start: string; end: string; location: string }
export type SomedayDraft = { title: string; note: string; matchIds: string[]; via: 'ai' | 'device'; note2: string | null }

export const SOMEDAY_MATCHES = 5
const OPENERS = /^(?:(?:i(?:'ve| have)?|i'd|we(?:'ve)?|someday|one day|maybe|really|always|kind of|kinda|sort of|just|would|like|love|want(?:ed)?|wanna|to|try(?:ing)? to|be able to|finally|get to|go and)\s+)+/i
const STOP = new Set(['with', 'and', 'the', 'a', 'an', 'to', 'of', 'in', 'on', 'at', 'for', 'some', 'my', 'friend', 'friends', 'someone', 'people', 'time',
  'when', 'know', 'dont', "don't", 'but', 'or', 'it', 'this', 'that', 'there', 'here', 'go', 'do', 'try', 'get', 'have', 'been', 'want', 'wanted', 'like',
  'would', 'always', 'someday', 'maybe', 'really', 'something', 'thing', 'things', 'out', 'up', 'new', 'more', 'about', 'week', 'weekend', 'day', 'night'])

/** Plain words that carry meaning, cut to a rough stem ("painting" and "paint" meet). */
function stems(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s'-]/g, ' ').split(/\s+/)
    .filter(w => w.length > 2 && !STOP.has(w))
    .map(w => w.replace(/'s$/, '').replace(/(ing|ers|er|es|s)$/, '').replace(/(.)\1$/, '$1'))
    .filter(w => w.length > 2)
}

/** Title and note from the student's own words, with no AI. */
export function draftOnDevice(text: string, events: readonly SomedayMatchEvent[]): SomedayDraft {
  const clean = text.replace(/\s+/g, ' ').trim()
  // "I've always wanted to try ceramics with a friend, but I don't know when."
  const [main, ...rest] = clean.split(/,\s*(?:but|though|and)?\s*|\.\s+|\s+but\s+/i)
  let core = (main ?? clean).replace(OPENERS, '').replace(/[.!?]+$/, '').trim()
  const withWho = /\s+(with\s+(?:a |my |some )?[\w' -]{2,30})$/i.exec(core)
  if (withWho) core = core.slice(0, withWho.index).trim()
  const title = (core ? core[0].toUpperCase() + core.slice(1) : clean).slice(0, MAX_IDEA_TITLE)
  const note = [withWho ? withWho[1][0].toUpperCase() + withWho[1].slice(1) + '.' : '', rest.join(', ').trim() ? rest.join(', ').trim().replace(/^./, c => c.toUpperCase()).replace(/([^.!?])$/, '$1.') : '']
    .filter(Boolean).join(' ').slice(0, MAX_IDEA_NOTE)
  const want = new Set(stems(core || clean))
  const scored = events.map(e => {
    const inTitle = stems(e.title).filter(w => want.has(w)).length
    const inText = stems(e.description).filter(w => want.has(w)).length
    return { id: e.id, score: inTitle * 3 + Math.min(inText, 3), date: e.date + e.start }
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score || a.date.localeCompare(b.date))
  return { title, note, matchIds: scored.slice(0, SOMEDAY_MATCHES).map(x => x.id), via: 'device', note2: null }
}

export async function draftSomeday(text: string, events: readonly SomedayMatchEvent[], useAi: boolean, fetcher: typeof fetch = fetch): Promise<SomedayDraft> {
  const words = text.trim().slice(0, 400)
  if (!useAi || words.length < 3) return draftOnDevice(words, events)
  try {
    const res = await fetcher('/api/ai/someday', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: words }), signal: AbortSignal.timeout(12_000) })
    if (!res.ok) return { ...draftOnDevice(words, events), note2: 'AI help is off right now, so this card was made on your device.' }
    const v = await res.json() as { title?: unknown; note?: unknown; matches?: unknown }
    const known = new Set(events.map(e => e.id))
    const ids = (Array.isArray(v.matches) ? v.matches : []).map(m => (m as { id?: unknown })?.id).filter((id): id is string => typeof id === 'string' && known.has(id))
    const title = typeof v.title === 'string' && v.title.trim() ? v.title.trim().slice(0, MAX_IDEA_TITLE) : draftOnDevice(words, events).title
    const note = typeof v.note === 'string' ? v.note.trim().slice(0, MAX_IDEA_NOTE) : ''
    return { title, note, matchIds: [...new Set(ids)].slice(0, SOMEDAY_MATCHES), via: 'ai', note2: 'Written by AI from your words. Change anything before you save.' }
  } catch {
    return { ...draftOnDevice(words, events), note2: 'AI help could not be reached, so this card was made on your device.' }
  }
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
/** "Tue, Nov 24 · 10–11am · Dowd 104" for one event in the pick list. */
export function matchLine(e: Pick<SomedayMatchEvent, 'date' | 'start' | 'end' | 'location'>): string {
  const d = new Date(e.date + 'T12:00:00Z')
  return `${DOW[d.getUTCDay()]}, ${MON[d.getUTCMonth()]} ${d.getUTCDate()} · ${clockSpan(toMinutes(e.start) ?? 0, toMinutes(e.end) ?? 0)} · ${e.location}`
}
