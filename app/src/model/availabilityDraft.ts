// MODEL: conservative, local preview for informal group-availability statements.
// This does not infer a real date, timezone, consent or verified free-time interval.
// The person must explicitly approve the original text before any group write.
export type AvailabilityCues = {
  day: string | null
  after: string | null
  until: string | null
  homeBy: string | null
  tentative: boolean
  nearby: boolean
  questions: string[]
}

const timeWords = 'one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|noon|midnight'
const timePattern = '(?:[01]?\\d|2[0-3])(?::[0-5]\\d)?|' + timeWords
const withPeriod = '(?:' + timePattern + ')(?:\\s*(?:am|pm|a\\.m\\.|p\\.m\\.))?'

function readTime(source: string, prefix: string): string | null {
  const match = new RegExp('\\b(?:' + prefix + ')\\s+(' + withPeriod + ')(?!\\w)', 'i').exec(source)
  return match?.[1]?.trim() ?? null
}

function ambiguousHour(phrase: string): boolean {
  if (/\\b(?:noon|midnight)\\b/i.test(phrase)) return false
  if (/(?:am|pm|a\\.m\\.|p\\.m\\.)$/i.test(phrase)) return false
  const hour = Number(phrase.match(/^\\d{1,2}/)?.[0] ?? -1)
  return !(hour >= 13 && hour <= 23)
}

export function previewAvailabilityDraft(source: string): AvailabilityCues {
  const day = source.match(/\\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|weekend)\\b/i)?.[0] ?? null
  const range = new RegExp('\\b(?:between|from)\\s+(' + withPeriod + ')\\s+(?:and|to)\\s+(' + withPeriod + ')(?!\\w)', 'i').exec(source)
  const after = range?.[1] ?? readTime(source, 'after|from')
  const until = range?.[2] ?? readTime(source, 'until|before')
  // A return-home deadline must NEVER be presented as an event ending time.
  const homeBy = readTime(source, 'home\\s+by|back\\s+by|return\\s+by|returning\\s+by')
  const tentative = /\\b(?:probably|maybe|might|possibly|tentative|uncertain|not sure|i think|depending|depends|unless)\\b/i.test(source)
  const nearby = /\\b(?:nearby|close by|near campus|close to campus|walking distance|walkable)\\b/i.test(source)
  const questions: string[] = []
  if (!day) questions.push('Which day or date does this refer to?')
  else if (/^(?:today|tomorrow|weekend)$/i.test(day)) {
    questions.push('Confirm the exact calendar date before planning.')
  } else {
    questions.push('Confirm the calendar date; a weekday alone does not select a particular week.')
  }
  if (!after && !until && !homeBy) {
    questions.push('No reliable time boundary was recognized. Keep the original wording and clarify it.')
  }
  if ([after, until, homeBy].some(value => value && ambiguousHour(value))) {
    questions.push('Confirm AM or PM for any time without an explicit period.')
  }
  if (homeBy) questions.push('Getting home by this time requires travel time; it is not the event end time.')
  if (tentative) questions.push('Tentative availability must stay tentative until you confirm it.')
  return { day, after, until, homeBy, tentative, nearby, questions }
}
