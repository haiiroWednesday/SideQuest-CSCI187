import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createSomedayController, type IntentionStatus, type SomedayResult } from '../controller/someday'
import { createAccountSomedayController, type AccountSomedayStep } from '../controller/accountData'
import type { PersonalStorePort } from '../controller/personalClient'

/** Signed in, ideas live in the account (`store`); signed out, on this device as before. */
export function useSomeday(store?: PersonalStorePort | null) {
  const local = useMemo(() => createSomedayController(), [])
  const account = useMemo(() => store ? createAccountSomedayController(store) : null, [store])
  const [state, setState] = useState<SomedayResult>(() => account ? account.initial() : local.read())
  const [shownFor, setShownFor] = useState(account)
  // Signing in or out swaps where ideas live; start from that place's first state.
  if (shownFor !== account) { setShownFor(account); setState(account ? account.initial() : local.read()) }
  // Where ideas live right now. An answer for an account that has since signed out writes nothing.
  const live = useRef(account)
  live.current = account
  const refresh = useCallback(() => {
    if (account) void account.load().then(next => { if (live.current === account) setState(next) })
    else setState(local.read())
  }, [account, local])
  useEffect(() => {
    if (account) { let live = true; void account.load().then(next => { if (live) setState(next) }); return () => { live = false } }
    const onStorage = (event: StorageEvent) => {
      if (local.handlesStorageChange(event.key)) refresh()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [account, local, refresh])
  // Account changes show at once and settle when the server answers (or roll back with a message).
  const step = (next: AccountSomedayStep) => {
    setState(next.now)
    const from = account
    void next.saved?.then(settled => { if (live.current === from) setState(settled) })
    return next.now.error === null
  }
  const add = (title: string, note: string): boolean => {
    if (account) return step(account.add(title, note))
    const next = local.add(title, note)
    setState(next)
    return next.error === null
  }
  /** Talk to Someday: save the card and link the event the student picked, in one go. */
  const addLinked = (title: string, note: string, eventId: string | null): boolean => {
    if (account) {
      const added = account.add(title, note)
      if (!step(added)) return false
      const id = added.now.items[0]?.id
      if (eventId && id) step(account.link(id, eventId))
      return true
    }
    const next = local.add(title, note)
    if (next.error !== null) { setState(next); return false }
    setState(eventId && next.items[0] ? local.link(next.items[0].id, eventId) : next)
    return true
  }
  return {
    ...state, refresh, add, addLinked,
    link: (id: string, eventId: string | null) => { if (account) step(account.link(id, eventId)); else setState(local.link(id, eventId)) },
    setStatus: (id: string, status: IntentionStatus) => { if (account) step(account.setStatus(id, status)); else setState(local.setStatus(id, status)) },
    recover: () => {
      if (account) { refresh(); return }
      if (window.confirm('Replace unreadable Someday data with an empty list? This cannot be undone.')) {
        setState(local.recover())
      }
    },
  }
}
