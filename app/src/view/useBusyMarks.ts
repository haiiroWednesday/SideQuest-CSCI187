// VIEW hook: Discover's busy marks. Signed out they last for this visit only, as before.
// Signed in they load from the account and every change is saved there.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createAccountBusyController } from '../controller/accountData'
import type { FreeMarks } from '../controller/freeMarks'
import type { PersonalStorePort } from '../controller/personalClient'

export function useBusyMarks(store?: PersonalStorePort | null) {
  const account = useMemo(() => store ? createAccountBusyController(store) : null, [store])
  const [marks, setLocal] = useState<FreeMarks>({})
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    setLocal({}); setError(null)
    if (!account) return
    let live = true
    void account.load().then(result => { if (!live) return; setLocal(result.marks); setError(result.error) })
    return () => { live = false }
  }, [account])
  const setMarks = useCallback((next: FreeMarks) => {
    setLocal(next)
    if (!account) return
    void account.save(next).then(result => {
      setError(result.error)
      // A refused save puts the bar back to what the account holds.
      if (result.error) setLocal(result.marks)
    })
  }, [account])
  return { marks, setMarks, error }
}
