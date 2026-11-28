// VIEW: short-lived messages that slide in at the bottom of the page and leave on their own.
// The timer is the shrinking bar's CSS animation. Hovering or focusing a toast pauses it,
// and the toast closes when the bar finishes. Errors and warnings (a clash) have no timer: they stay until closed.
// A toast that reports a change can offer Undo; Undo puts the change back and closes the toast.
import { useEffect, useRef, useState } from 'react'

export type ToastTone = 'success' | 'info' | 'warning' | 'error'
export type ToastItem = {
  key: string
  tone: ToastTone
  text: string
  action?: { label: string; onClick?: () => void; href?: string }
  /** Takes the change this toast reports back. */
  undo?: () => void
  /** Stays until closed, whatever its tone (a line about the page itself, not news). */
  sticky?: boolean
  testId?: string
}

const TOAST_EXIT_DURATION_MS = 220
const LIFETIME_MS: Record<ToastTone, number | null> = { success: 4500, info: 6500, warning: null, error: null }
// Time to read the toast and reach Undo before it leaves.
const UNDO_LIFETIME_MS = 8000
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
  const life = toast.sticky ? null : toast.undo && LIFETIME_MS[toast.tone] !== null ? UNDO_LIFETIME_MS : LIFETIME_MS[toast.tone]
  // Leaving plays a short slide-out first, then the toast is removed.
  const [leaving, setLeaving] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const leave = () => {
    if (timer.current !== undefined) return
    setLeaving(true)
    timer.current = window.setTimeout(onClose, TOAST_EXIT_DURATION_MS)
  }
  useEffect(() => () => window.clearTimeout(timer.current), [])
  // A connection notice is information about the page, not news, so it is not announced.
  const role = toast.testId === 'catalog-not-shared' || toast.sticky ? 'note' : ROLE[toast.tone]
  return (
    <div className={`sq-toast sq-toast-${toast.tone}${leaving ? ' sq-toast-leaving' : ''}`} role={role} data-testid={toast.testId}>
      <span className="sq-toast-mark" aria-hidden="true">{toast.tone === 'success' ? '✓' : toast.tone === 'info' ? 'i' : '!'}</span>
      <p className="sq-toast-text">{toast.text}</p>
      {(toast.action || toast.undo) && <div className="sq-toast-acts">
        {toast.undo && <button type="button" className="sq-toast-action sq-toast-undo" onClick={() => { toast.undo?.(); leave() }}>Undo</button>}
        {toast.action?.href ? <a className="sq-toast-action" href={toast.action.href}>{toast.action.label}</a>
          : toast.action && <button type="button" className="sq-toast-action" onClick={toast.action.onClick}>{toast.action.label}</button>}
      </div>}
      <button type="button" className="sq-toast-close" aria-label="Dismiss message" onClick={leave}>×</button>
      {life !== null && (
        <span className="sq-toast-timer" aria-hidden="true" style={{ animationDuration: `${life}ms` }}
          onAnimationEnd={event => { if (event.target === event.currentTarget) leave() }} />
      )}
    </div>
  )
}
