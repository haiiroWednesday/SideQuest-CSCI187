// Read-only contract for AI-ranked suggestions from the public catalog.
// Private plans, raw model text, and provider details do not cross this boundary.
import type { CampusEvent } from './eventCatalog'

export type AiEventSuggestion = Pick<CampusEvent, 'id' | 'title' | 'date' | 'start' | 'end' | 'location'>
export type AiDiscoverResult = {
  matches: AiEventSuggestion[]
  timeInterpretation: {
    date: string | null
    dateEnd?: string | null
    start: string | null
    end: string | null
    applied: 'full_window' | 'date_range' | 'date_only' | 'none'
  }
  catalogTruncated: boolean
}

export function isAiDiscoverResult(input: unknown): input is AiDiscoverResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return false
  const result = input as Partial<AiDiscoverResult>
  if (typeof result.catalogTruncated !== 'boolean' ||
      !Array.isArray(result.matches) || result.matches.length > 8) return false
  if (!result.matches.every(item =>
    item && typeof item === 'object' &&
    ['id', 'title', 'date', 'start', 'end', 'location'].every(key =>
      typeof (item as unknown as Record<string, unknown>)[key] === 'string')
  )) return false
  const time = result.timeInterpretation
  if (!time || !['full_window', 'date_range', 'date_only', 'none'].includes(time.applied)) return false
  if (time.dateEnd !== undefined && time.dateEnd !== null && typeof time.dateEnd !== 'string') return false
  if (time.applied === 'date_range' && (typeof time.date !== 'string' || typeof time.dateEnd !== 'string')) return false
  return ['date', 'start', 'end'].every(key =>
    (time as unknown as Record<string, unknown>)[key] === null ||
    typeof (time as unknown as Record<string, unknown>)[key] === 'string')
}
