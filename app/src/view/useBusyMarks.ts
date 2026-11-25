// VIEW hook: the one source of the student's own time, read by Discover and My Schedule alike.
// Busy time: signed out it lasts for this visit only, as before; signed in it loads from the
// account and every change is saved there. Free time marked in Free mode and the Busy/Free
// switch last for this visit.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createAccountBusyController } from '../controller/accountData'
import type { FreeMarks, MarkMode } from '../controller/freeMarks'
import type { PersonalStorePort } from '../controller/personalClient'

export function useBusyMarks(store?: PersonalStorePort | null) {
  const account = useMemo(() => store ? createAccountBusyController(store) : null, [store])
  const [marks, setLocal] = useState<FreeMarks>({})
  const [open, setOpen] = useState<FreeMarks>({})
  const [mode, setMode] = useState<MarkMode>('busy')
  const [error, setError] = useState<string | null>(null)
  // The account these marks belong to. A save that settles after sign-out (or after another
  // student signs in) belongs to an account that is gone, so it writes nothing.
  const live = useRef(account)
  live.current = account
  useEffect(() => {
    setLocal({}); setError(null)
    if (!account) return
    void account.load().then(result => { if (live.current !== account) return; setLocal(result.marks); setError(result.error) })
  }, [account])
  const setMarks = useCallback((next: FreeMarks) => {
    setLocal(next)
    setError(null)
    if (!account) return
    void account.save(next).then(result => {
      if (live.current !== account) return
      // Only the newest save settles the bar. A refused one still takes its own change back now.
      if (result.error) { setError(result.error); setLocal(result.marks) }
      else if (!result.stale) setLocal(result.marks)
    })
  }, [account])
  return { marks, setMarks, open, setOpen, mode, setMode, error }
}
