// VIEW hook: keep the responsive event-details dialog keyboard-accessible.
import { useEffect, useState, type RefObject } from 'react'

export function usePhoneViewport(): boolean {
  const [phone, setPhone] = useState(
    () => typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 760px)').matches,
  )
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const query = window.matchMedia('(max-width: 760px)')
    const update = () => setPhone(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return phone
}

type DetailFocusOptions = {
  phone: boolean
  sheetOpen: boolean
  panelRef: RefObject<HTMLElement | null>
  returnFocusRef: RefObject<HTMLElement | null>
  onClose: () => void
  selectedId: string | undefined
  selectedPlanned: boolean | undefined
  planningBlocked: boolean
}

export function useMobileDetailFocus({
  phone, sheetOpen, panelRef, returnFocusRef, onClose,
  selectedId, selectedPlanned, planningBlocked,
}: DetailFocusOptions): void {
  const modal = phone && sheetOpen

  useEffect(() => {
    const panel = panelRef.current
    if (!modal || !panel) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ;(panel.querySelector<HTMLElement>('.sq-sheet-close') ?? panel.querySelector<HTMLElement>('button:not(:disabled), a[href]'))?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const controls = [...panel.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]',
      )]
      const first = controls[0], last = controls[controls.length - 1]
      if (!first) return
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = originalOverflow
      document.removeEventListener('keydown', onKey)
      if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus()
    }
  }, [modal, panelRef, returnFocusRef, onClose])

  // Planning can disable the focused control while the sheet stays open.
  // Move focus to a usable control without closing the dialog.
  useEffect(() => {
    const panel = panelRef.current
    if (!modal || !panel) return
    const active = document.activeElement
    if (!panel.contains(active) || (active instanceof HTMLButtonElement && active.disabled)) {
      ;(panel.querySelector<HTMLElement>('.sq-sheet-close') ?? panel.querySelector<HTMLElement>('button:not(:disabled), a[href]'))?.focus()
    }
  }, [modal, panelRef, selectedId, selectedPlanned, planningBlocked])
}
