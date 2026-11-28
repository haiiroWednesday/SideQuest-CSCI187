// VIEW hook: the one source of the student's own time, read by Discover and My Schedule alike.
// Busy time: signed out it lasts for this visit only, as before; signed in it loads from the
// account and every change is saved there. Free time marked in Free mode and the Busy/Free
// switch last for this visit.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { calendarMarksOf, calendarWithin, createAccountBusyController, rangesToMarks } from '../controller/accountData'
import type { FreeMarks, MarkMode } from '../controller/freeMarks'
import type { BusyRange, PersonalStorePort } from '../controller/personalClient'


/** `seed` is design-review sample busy time for a signed-out page; it is never saved. */
export function useBusyMarks(store?: PersonalStorePort | null, seed?: readonly BusyRange[]) {
  const account = useMemo(() => store ? createAccountBusyController(store) : null, [store])
  const [marks, setLocal] = useState<FreeMarks>(() => store || !seed ? {} : rangesToMarks(seed))
  // Steps that came from Google Calendar, coloured apart on the bar. Display only.
  const [calendar, setCalendar] = useState<FreeMarks>(() => store || !seed ? {} : calendarMarksOf(seed))
  const [open, setOpen] = useState<FreeMarks>({})
  const [mode, setMode] = useState<MarkMode>('busy')
  const [error, setError] = useState<string | null>(null)
  // False while an account's saved busy time is still on its way, so nothing asks "no busy time yet?" too early.
  const [ready, setReady] = useState(!store)
  // The account these marks belong to. A save that settles after sign-out (or after another
  // student signs in) belongs to an account that is gone, so it writes nothing.
  const live = useRef(account)
  live.current = account
  useEffect(() => {
    if (!account) { if (!seed) { setLocal({}); setCalendar({}) } setError(null); setReady(true); return }
    setLocal({}); setCalendar({}); setError(null); setReady(false)
    void account.load().then(result => { if (live.current !== account) return; setLocal(result.marks); setCalendar(result.calendar); setError(result.error); setReady(true) })
  }, [account])
  const setMarks = useCallback((next: FreeMarks) => {
    setLocal(next)
    setCalendar(current => calendarWithin(current, next))
    setError(null)
    if (!account) return
    void account.save(next).then(result => {
      if (live.current !== account) return
      // Only the newest save settles the bar. A refused one still takes its own change back now.
      if (result.error) { setError(result.error); setLocal(result.marks); setCalendar(result.calendar) }
      else if (!result.stale) { setLocal(result.marks); setCalendar(result.calendar) }
    })
  }, [account])
  return { marks, calendar, setMarks, open, setOpen, mode, setMode, error, ready }
}
