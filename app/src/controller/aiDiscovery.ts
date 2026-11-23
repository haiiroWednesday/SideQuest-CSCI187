// Controller: interpret server-verified AI suggestions; Views never call a model SDK.
import { isAiDiscoverResult, type AiDiscoverResult, type AiEventSuggestion } from '../model/aiDiscovery'
import { formatEventDate, formatEventTime } from '../presentation/formatEvents'

export type { AiDiscoverResult } from '../model/aiDiscovery'

export async function aiSearchAvailable(fetcher: typeof fetch = fetch): Promise<boolean> {
  try {
    const response = await fetcher('/api/ai/status', { credentials: 'same-origin', signal: AbortSignal.timeout(5000) })
    if (!response.ok) return false
    const value: unknown = await response.json()
    return Boolean(value && typeof value === 'object' && (value as { available?: unknown }).available === true)
  } catch { return false }
}

export async function requestAiDiscovery(
  query: string, signal?: AbortSignal, fetcher: typeof fetch = fetch,
): Promise<AiDiscoverResult> {
  const text = query.trim()
  if (text.length < 3 || text.length > 240) throw new Error('Enter 3–240 characters describing an activity.')
  let response: Response
  try {
    response = await fetcher('/api/ai/discover', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: text }), signal,
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new Error('Could not reach AI discovery. Try the regular event filters.')
  }
  let value: unknown
  try { value = await response.json() }
  catch { throw new Error('AI discovery returned an unreadable response.') }
  if (!response.ok) {
    const message = value && typeof value === 'object' && typeof (value as { error?: unknown }).error === 'string'
      ? (value as { error: string }).error : 'AI discovery is unavailable. Try again later.'
    throw new Error(message.slice(0, 180))
  }
  if (!isAiDiscoverResult(value)) throw new Error('AI discovery returned invalid event suggestions.')
  return value
}

// Match the app's existing campus-friendly date/time presentation convention.
export function aiSuggestionDetails(item: AiEventSuggestion): string {
  return `${formatEventDate(item.date)} · ${formatEventTime(item.start)}–${formatEventTime(item.end)} · ${item.location}`
}
