import { useCallback, useEffect, useMemo, useState } from 'react'
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
  const refresh = useCallback(() => {
    if (account) void account.load().then(setState)
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
    void next.saved?.then(setState)
    return next.now.error === null
  }
  const add = (title: string, note: string): boolean => {
    if (account) return step(account.add(title, note))
    const next = local.add(title, note)
    setState(next)
    return next.error === null
  }
  return {
    ...state, refresh, add,
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
