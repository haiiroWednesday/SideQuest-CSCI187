// Optional AI suggestions for the PUBLIC catalog. The existing View and
// Controller remain responsible for actual event details and planning.
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { aiSearchAvailable, requestAiDiscovery, aiSuggestionDetails, type AiDiscoverResult } from '../controller/aiDiscovery'
import './ai-discovery.css'

export function AiDiscoverPanel({ visibleEventIds, onChoose }: {
  visibleEventIds: readonly string[]
  onChoose: (id: string) => void
}) {
  const [available, setAvailable] = useState(false)
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<AiDiscoverResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const requestId = useRef(0)
  const controller = useRef<AbortController | null>(null)

  useEffect(() => {
    let mounted = true
    void aiSearchAvailable().then(value => { if (mounted) setAvailable(value) })
    return () => {
      mounted = false
      requestId.current += 1
      controller.current?.abort()
    }
  }, [])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (query.trim().length < 3 || query.trim().length > 240) {
      setError('Enter 3–240 characters describing an activity.')
      return
    }
    const id = ++requestId.current
    controller.current?.abort()
    const next = new AbortController()
    controller.current = next
    setRunning(true)
    setError(null)
    setResult(null)
    try {
      const selected = await requestAiDiscovery(query, next.signal)
      if (requestId.current === id) setResult(selected)
    } catch (reason) {
      if (requestId.current === id && !next.signal.aborted) {
        setError(reason instanceof Error ? reason.message : 'AI discovery is unavailable.')
      }
    } finally {
      if (requestId.current === id) setRunning(false)
    }
  }

  if (!available) return null
  const listed = new Set(visibleEventIds)
  const hidden = result?.matches.filter(item => !listed.has(item.id)).length ?? 0
  return (
    <section className="sq-ai" aria-labelledby="sq-ai-heading">
      <div className="sq-ai-intro">
        <h2 id="sq-ai-heading">Ask <em>SideQuest.</em></h2>
        <p>Describe what you feel like doing. Your search and public event details are sent to an external AI service.</p>
      </div>
      <form className="sq-ai-form" onSubmit={event => { void submit(event) }} role="search" aria-label="AI event suggestions">
        <label htmlFor="sq-ai-query" className="sq-visually-hidden">What would you like to do?</label>
        <input id="sq-ai-query" type="search" value={query} maxLength={240}
          onChange={event => setQuery(event.target.value)}
          placeholder="e.g. an art workshop this weekend" />
        <button type="submit" disabled={running || query.trim().length < 3}>
          {running ? 'Finding…' : 'Find events'}
        </button>
      </form>
      {error && <p className="sq-ai-error" role="alert">{error}</p>}
      {running && <p role="status" className="sq-ai-note">Checking the public catalog…</p>}
      {result && (
        <div className="sq-ai-results" aria-live="polite">
          <p className="sq-ai-note">
            {result.timeInterpretation.applied === 'full_window'
              ? result.timeInterpretation.dateEnd
                ? `Events checked for ${result.timeInterpretation.date} through ${result.timeInterpretation.dateEnd}, including their full time fit.`
                : 'Event date and times checked against the interpreted full window.'
              : result.timeInterpretation.applied === 'date_range'
                ? `Events checked for ${result.timeInterpretation.date} through ${result.timeInterpretation.dateEnd}. Full time fit is unconfirmed.`
                : result.timeInterpretation.applied === 'date_only'
                  ? 'Event date checked. Full time fit is unconfirmed.'
                  : 'Suggestions only. Use the free-time form above to confirm what fits.'}
          </p>
          {result.matches.length ? (
            <ul>
              {result.matches.map(item => (
                <li key={item.id}>
                  {listed.has(item.id) ? (
                    <button type="button" onClick={() => onChoose(item.id)}
                      aria-label={`View AI suggestion for ${item.title}`}>
                      <strong>{item.title}</strong>
                      <small>{aiSuggestionDetails(item)}</small>
                    </button>
                  ) : (
                    <span className="sq-ai-hidden-result">
                      <strong>{item.title}</strong>
                      <small>Outside the current Discover filter</small>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : <p className="sq-ai-note">No suggested events matched the currently checked catalog.</p>}
          {hidden > 0 && <p className="sq-ai-note">Clear the free-time filter above to view {hidden} hidden suggestion{hidden === 1 ? '' : 's'}.</p>}
          {result.catalogTruncated && <p className="sq-ai-note">Only the first 40 upcoming catalog events were considered.</p>}
        </div>
      )}
    </section>
  )
}
