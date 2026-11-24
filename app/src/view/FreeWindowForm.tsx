// VIEW: a free-time form with controller-provided fit counts and validation feedback.
import type { FreeWindow, FreeWindowModel } from '../controller/presentScreens'

type FreeWindowFieldProps = {
  field: keyof FreeWindow
  label: string
  type: 'date' | 'time'
  free: FreeWindowModel
  onWindowChange: (window: FreeWindow) => void
}

function FreeWindowField({ field, label, type, free, onWindowChange }: FreeWindowFieldProps) {
  return (
    <label className={`sq-free-field${free.values[field] ? ' sq-set' : ''}`}>
      <span>{label}</span>
      <input type={type} value={free.values[field]}
        aria-describedby={free.error ? 'sq-free-error' : free.hint ? 'sq-free-hint' : undefined}
        onChange={event => onWindowChange({ ...free.values, [field]: event.target.value })} />
    </label>
  )
}

export function FreeWindowForm({ free, ready, onWindowChange, disabledByDialog }: {
  free: FreeWindowModel
  ready: boolean
  onWindowChange: (window: FreeWindow) => void
  disabledByDialog: boolean
}) {
  return (
    <form inert={disabledByDialog || undefined} className="sq-free" role="search" aria-label="When are you free?"
      onSubmit={event => event.preventDefault()}>
      <span className="sq-free-label" aria-hidden="true">When are you free?</span>
      <FreeWindowField field="date" label="Free on" type="date" free={free} onWindowChange={onWindowChange} />
      <FreeWindowField field="start" label="from" type="time" free={free} onWindowChange={onWindowChange} />
      <FreeWindowField field="end" label="until" type="time" free={free} onWindowChange={onWindowChange} />
      {free.fitText && ready && (
        <span className={`sq-free-count${free.fitCount === 0 ? ' sq-none' : ''}`} role="status">{free.fitText}</span>
      )}
      {free.canClear && (
        <button type="button" className="sq-free-clear"
          onClick={event => {
            // The button disappears once the form is empty, so keep focus in the form.
            const form = event.currentTarget.form
            onWindowChange({ date: '', start: '', end: '' })
            requestAnimationFrame(() => form?.querySelector<HTMLInputElement>('input')?.focus())
          }}>✕ Clear</button>
      )}
      {free.hint && <p id="sq-free-hint" className="sq-free-hint" role="status">{free.hint}</p>}
      {free.error && <p id="sq-free-error" className="sq-free-error" role="alert">{free.error}</p>}
    </form>
  )
}
