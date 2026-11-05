// VIEW: collect a complete free-time window and render Controller feedback.
import type { FreeWindow, FreeWindowModel } from '../controller/presentScreens'

export function FreeWindowForm({ free, ready, onWindowChange, disabledByDialog }: {
  free: FreeWindowModel
  ready: boolean
  onWindowChange: (window: FreeWindow) => void
  disabledByDialog: boolean
}) {
  const field = (key: keyof FreeWindow, label: string, type: 'date' | 'time') => (
    <label className={`sq-free-field${free.values[key] ? ' sq-set' : ''}`}>
      <span>{label}</span>
      <input
        type={type}
        value={free.values[key]}
        aria-describedby={free.error ? 'sq-free-error' : free.hint ? 'sq-free-hint' : undefined}
        onChange={event => onWindowChange({ ...free.values, [key]: event.target.value })}
      />
    </label>
  )
  return (
    <form inert={disabledByDialog || undefined} className="sq-free" role="search" aria-label="When are you free?" onSubmit={event => event.preventDefault()}>
    <span className="sq-free-label" aria-hidden="true">When are you free?</span>
    {field('date', 'Free on', 'date')}
    {field('start', 'from', 'time')}
    {field('end', 'until', 'time')}
    {free.fitText && ready && <span className={`sq-free-count${free.fitCount === 0 ? ' sq-none' : ''}`} role="status">{free.fitText}</span>}
    {free.canClear && (
    <button type="button" className="sq-free-clear" onClick={() => onWindowChange({ date: '', start: '', end: '' })}>
    ✕ Clear
    </button>
    )}
    {free.hint && <p id="sq-free-hint" className="sq-free-hint" role="status">{free.hint}</p>}
    {free.error && <p id="sq-free-error" className="sq-free-error" role="alert">{free.error}</p>}
    </form>
  )
}
