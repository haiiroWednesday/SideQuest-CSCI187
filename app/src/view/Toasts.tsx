// VIEW: short-lived messages that slide in at the bottom of the page and leave on their own.
// The timer is the shrinking bar's CSS animation. Hovering or focusing a toast pauses it,
// and the toast closes when the bar finishes. Errors have no timer: they stay until closed.
import { useEffect, useRef, useState } from 'react'

export type ToastTone = 'success' | 'info' | 'warning' | 'error'
export type ToastItem = {
  key: string
  tone: ToastTone
  text: string
  action?: { label: string; onClick: () => void }
  testId?: string
}

const LIFETIME_MS: Record<ToastTone, number | null> = { success: 4500, info: 6500, warning: 8000, error: null }
const ROLE: Record<ToastTone, 'status' | 'alert' | 'note'> = { success: 'status', info: 'status', warning: 'alert', error: 'alert' }

export function ToastStack({ toasts }: { toasts: ToastItem[] }) {
  const [closed, setClosed] = useState<ReadonlySet<string>>(() => new Set())
  const visible = toasts.filter(toast => !closed.has(toast.key))
  const close = (key: string) => setClosed(previous => new Set(previous).add(key))
  return (
    <div className="sq-toasts">
      {visible.map(toast => <Toast key={toast.key} toast={toast} onClose={() => close(toast.key)} />)}
    </div>
  )
}

function Toast({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  const life = LIFETIME_MS[toast.tone]
  // Leaving plays a short slide-out first, then the toast is removed.
  const [leaving, setLeaving] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const leave = () => {
    if (timer.current !== undefined) return
    setLeaving(true)
    timer.current = window.setTimeout(onClose, 220)
  }
  useEffect(() => () => window.clearTimeout(timer.current), [])
  // A connection notice is information about the page, not news, so it is not announced.
  const role = toast.testId === 'catalog-not-shared' ? 'note' : ROLE[toast.tone]
  return (
    <div className={`sq-toast sq-toast-${toast.tone}${leaving ? ' sq-toast-leaving' : ''}`} role={role} data-testid={toast.testId}>
      <span className="sq-toast-mark" aria-hidden="true">{toast.tone === 'success' ? '✓' : toast.tone === 'info' ? 'i' : '!'}</span>
      <p className="sq-toast-text">{toast.text}</p>
      {toast.action && <button type="button" className="sq-toast-action" onClick={toast.action.onClick}>{toast.action.label}</button>}
      <button type="button" className="sq-toast-close" aria-label="Dismiss message" onClick={leave}>×</button>
      {life !== null && (
        <span className="sq-toast-timer" aria-hidden="true" style={{ animationDuration: `${life}ms` }}
          onAnimationEnd={event => { if (event.target === event.currentTarget) leave() }} />
      )}
    </div>
  )
}
