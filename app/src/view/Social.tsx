// VIEW (design review): open invites, find a time for a group, and the small inbox count.
// Rules live in controller/socialPlans; the state (groups, invites, storage) in controller/groupsPreview,
// handed in by the design-review provider (DesignReview.tsx, loaded only in that build).
// This file draws them and passes taps back. Nothing here reads or sends a location.
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  audienceOf, canMakePlan, commonDays, inviteErrors, joinBlock, reachableGroups, PLACE_MAX, TITLE_MAX,
  type CommonTime, type InviteDraft, type OpenInvite, type SocialGroup, type Slot,
} from '../controller/socialPlans'
import { clock, span } from '../controller/freeMarks'
import { personColor } from '../controller/groupPeople'
import { EventStub } from './DiscoverView'
import { presentBrowseDetail } from '../controller/screenModels'
import { TimePick } from './Pickers'
import './social.css'

export type SocialEvent = { id: string; title: string; location: string; date: string; start: string; end: string }
type Ev = SocialEvent
export type GroupFit = { groupId: string; name: string; windows: Slot[] }
export type Compose = { date: string; start: string; end: string; groupIds?: string[] }

export type SocialApi = {
  you: string
  groups: SocialGroup[]
  invites: OpenInvite[]
  now: () => Date
  unread: number
  markRead: () => void
  compose: (c: Compose) => void
  join: (id: string) => void
  leave: (id: string) => void
  callOff: (id: string) => void
  /** Turns your invite into a group plan. Returns the plan's group, or null. */
  planned: (id: string) => string | null
  sharing: (groupId: string) => boolean
  setSharing: (groupId: string, on: boolean) => void
  common: (groupId: string) => CommonTime
  groupFit: GroupFit | null
  setGroupFit: (fit: GroupFit | null) => void
}
export const SocialContext = createContext<SocialApi | null>(null)
export const useSocial = () => useContext(SocialContext)
/** New open invites and answers since you last opened Groups. 0 outside the design review. */
export const useInboxCount = () => useContext(SocialContext)?.unread ?? 0

const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0) }
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
function dayLabel(date: string, today: string): string {
  if (date === today) return 'Today'
  const [y, m, d] = date.split('-').map(Number)
  return `${DOW[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${d}`
}
const todayOf = (now: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(now)

/** "I'm free, who's in?": two taps from a free stretch (open, Send). Everything else is optional. */
export function ComposeSheet({ api, events, start, onSend, onClose }: {
  api: SocialApi; events: readonly Ev[]; start: Compose; onSend: (d: InviteDraft) => void; onClose: () => void
}) {
  const mine = reachableGroups(api.groups, api.you)
  const [title, setTitle] = useState('Free to hang out')
  const [place, setPlace] = useState('')
  const [eventId, setEventId] = useState<string | undefined>()
  const [from, setFrom] = useState(start.start)
  const [until, setUntil] = useState(start.end)
  // Only the group you started from, or your one group. Never every group at once (ux 23).
  const [groupIds, setGroupIds] = useState<string[]>(start.groupIds ?? (mine.length === 1 ? [mine[0].id] : []))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const dialog = useRef<HTMLDivElement>(null)
  const sendRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    sendRef.current?.focus()
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    addEventListener('keydown', key)
    return () => removeEventListener('keydown', key)
  }, [onClose])
  // Catalog events that fit inside the stretch, so an invite can be for one of them.
  const fits = events.filter(e => e.date === start.date && toMin(e.start) >= toMin(start.start) && toMin(e.end) <= toMin(start.end)).slice(0, 3)
  const draft: InviteDraft = { title, place, eventId, date: start.date, start: from, end: until, groupIds }
  const reach = audienceOf({ by: api.you, groupIds }, api.groups).length
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs = inviteErrors(draft, api.you, api.groups, api.now())
    setErrors(errs)
    if (!Object.keys(errs).length) onSend(draft)
  }
  const pick = (ev: Ev) => {
    if (eventId === ev.id) { setEventId(undefined); return }
    setEventId(ev.id); setTitle(ev.title.slice(0, TITLE_MAX)); setPlace(ev.location.slice(0, PLACE_MAX)); setFrom(ev.start); setUntil(ev.end)
  }
  return (
    // The sheet sits outside the page, so it carries the page's scope (fonts, colours, brushes) without its box.
    <div className="sq-discover-page sq-oi-host">
    <div className="sq-oi-scrim" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="sq-oi-sheet" role="dialog" aria-modal="true" aria-labelledby="sq-oi-title" ref={dialog}>
        <form onSubmit={submit} noValidate>
          <h2 id="sq-oi-title">I'm free, who's in?</h2>
          <p className="sq-oi-when">{dayLabel(start.date, todayOf(api.now()))}, {span(toMin(from), toMin(until))}</p>
          <label className="sq-oi-field"><span>What</span>
            <input value={title} maxLength={TITLE_MAX} onChange={e => { setTitle(e.target.value); setEventId(undefined) }}
              aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? 'sq-oi-e-title' : undefined} />
          </label>
          {errors.title && <p className="sq-oi-err" id="sq-oi-e-title">{errors.title}</p>}
          {fits.length > 0 && <div className="sq-oi-fits" role="group" aria-label="Or one of these events">
            <span>Or one of these</span>
            {fits.map(ev => <button key={ev.id} type="button" aria-pressed={eventId === ev.id} onClick={() => pick(ev)}>{ev.title}</button>)}
          </div>}
          <label className="sq-oi-field"><span>Where <small>optional</small></span>
            <input value={place} maxLength={PLACE_MAX} onChange={e => setPlace(e.target.value)} placeholder="Benson, the lawn, Mission Gardens" />
          </label>
          <div className="sq-oi-times">
            <TimePick label="From" value={from} onChange={setFrom} firstHour={8} lastHour={22} />
            <span aria-hidden="true">–</span>
            <TimePick label="Until" value={until} onChange={setUntil} firstHour={8} lastHour={23} />
          </div>
          {errors.when && <p className="sq-oi-err" role="alert">{errors.when}</p>}
          <fieldset className="sq-oi-groups">
            <legend>Send to</legend>
            {mine.length ? mine.map(g => (
              <label key={g.id} className={groupIds.includes(g.id) ? 'sq-on' : undefined}>
                <input type="checkbox" checked={groupIds.includes(g.id)} onChange={e => setGroupIds(ids => e.target.checked ? [...ids, g.id] : ids.filter(x => x !== g.id))} />
                <span>{g.name}</span>
              </label>
            )) : <p>Make a group first, in Groups.</p>}
          </fieldset>
          {errors.groups && <p className="sq-oi-err" role="alert">{errors.groups}</p>}
          <p className="sq-oi-reach">Reaches {reach} {reach === 1 ? 'person' : 'people'}. Ends at {clock(toMin(until))}. No one sees where you are.</p>
          <div className="sq-oi-acts">
            <button type="submit" className="sq-plan-button" ref={sendRef}>Send</button>
            <button type="button" className="sq-dab-link" onClick={onClose}>Not now</button>
          </div>
        </form>
      </div>
    </div>
    </div>
  )
}

/** Open invites you sent and ones that reach you. Lives at the top of Groups. */
export function OpenInvites({ onMakePlan }: { onMakePlan: (invite: OpenInvite, groupId: string) => void }) {
  const api = useSocial()
  if (!api) return null
  const today = todayOf(api.now())
  const startFromGroups = () => {
    const now = api.now(), c = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now)
    const m = Math.ceil((toMin(c) + 1) / 30) * 30
    const s = Math.min(m, 21 * 60), e = Math.min(s + 60, 23 * 60)
    const hh = (x: number) => `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`
    api.compose({ date: today, start: hh(s), end: hh(e) })
  }
  return (
    <section className="sq-oi" aria-labelledby="sq-oi-h">
      <div className="sq-oi-head">
        <h2 id="sq-oi-h">Who's free</h2>
        <button type="button" className="sq-text-button sq-ink-act sq-oi-start" onClick={startFromGroups}>I'm free, who's in?</button>
      </div>
      {api.invites.length === 0 ? <p className="sq-oi-none">No open invites right now.</p> : (
        <ul className="sq-stubs sq-stubs-one sq-oi-list">
          {api.invites.map(inv => {
            const mineInv = inv.by === api.you
            const block = joinBlock(inv, api.you, api.groups, api.now())
            const inIt = inv.joins.includes(api.you)
            const names = api.groups.filter(g => inv.groupIds.includes(g.id)).map(g => g.name).join(', ')
            return (
              <li key={inv.id} className={`sq-oi-card${inv.status === 'planned' ? ' sq-oi-planned' : ''}`} data-testid="open-invite">
                <EventStub face={Boolean(inv.place)} dated stub={presentBrowseDetail({ id: inv.id, title: inv.title, location: inv.place ?? '', date: inv.date, start: inv.start, end: inv.end, hostName: mineInv ? 'You' : inv.by }, [], api.now())}>
                  <span className="sq-oi-by">To {names}</span>
                  <span className="sq-oi-in" role="group" aria-label={inv.joins.length ? `In: ${inv.joins.join(', ')}` : 'Nobody in yet'}>
                    {inv.joins.length ? <>
                      <span className="sq-oi-faces" aria-hidden="true">{inv.joins.slice(0, 4).map(n => <i key={n} style={{ background: personColor(n) }}>{n[0]}</i>)}</span>
                      <b aria-hidden="true">{inv.joins.length === 1 ? `${inv.joins[0]} is in` : `${inv.joins[0]} + ${inv.joins.length - 1} in`}</b>
                    </> : <em aria-hidden="true">Nobody in yet</em>}
                  </span>
                  <span className="sq-oi-acts">
                    {inv.status === 'planned' ? <b className="sq-fr-status sq-fr-status-confirmed">A plan now</b>
                      : mineInv ? <>
                        {canMakePlan(inv, api.you, api.now()) && <button type="button" className="sq-plan-button" onClick={() => { const g = api.planned(inv.id); if (g) onMakePlan(inv, g) }}>Make it a plan</button>}
                        <button type="button" className="sq-dab-link" onClick={() => api.callOff(inv.id)}>Call it off</button>
                      </> : inIt
                        ? <button type="button" className="sq-dab-link" onClick={() => api.leave(inv.id)}>I'm out</button>
                        : <button type="button" className="sq-plan-button" disabled={Boolean(block)} onClick={() => api.join(inv.id)}>I'm in<span className="sq-visually-hidden"> for {inv.title}</span></button>}
                  </span>
                </EventStub>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

/**
 * When is everyone free: free or busy only, from people who chose to share, never what or where.
 * `timetable` draws the chosen day (the Groups page hands in GroupTimetable, so the shipped app never
 * carries it). `band` is the common stretch the propose list is narrowed to, kept by the page.
 */
export function FindATime({ groupId, groupName, band = null, onBand, timetable }: {
  groupId: string; groupName: string; band?: Slot | null; onBand?: (band: Slot | null) => void
  timetable?: (common: CommonTime, date: string, day: string) => ReactNode
}) {
  const api = useSocial()
  const [day, setDay] = useState<string | null>(null)
  // A band that is no longer common time (sharing turned off, another day's free time changed) lets go.
  const gone = Boolean(api && band && !api.common(groupId).windows.some(w => w.date === band.date && w.start === band.start && w.end === band.end))
  useEffect(() => { if (gone) onBand?.(null) }, [gone, onBand])
  if (!api) return null
  const on = api.sharing(groupId)
  const c = api.common(groupId)
  const days = commonDays(c.windows, api.now())
  const chosen = day && days.some(d => d.date === day) ? day : (days.find(d => d.count > 0)?.date ?? days[0].date)
  const today = todayOf(api.now())
  const dayWindows = c.windows.filter(w => w.date === chosen)
  const START = 8 * 60, END = 23 * 60, pct = (t: string) => ((toMin(t) - START) / (END - START)) * 100
  return (
    <section className="sq-ft" aria-labelledby={`sq-ft-h-${groupId}`}>
      <h3 id={`sq-ft-h-${groupId}`}>When is everyone free?</h3>
      <label className={`sq-share-going sq-ft-share${on ? ' sq-on' : ''}`}>
        <input type="checkbox" checked={on} onChange={e => api.setSharing(groupId, e.target.checked)} />
        <span className="sq-share-box" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M4 10.5l4 4 8-9" /></svg></span>
        <span className="sq-share-text"><b>Share my free time with {groupName}</b>
          <small>{on ? "Shares when you're free for the next 7 days." : "Share your free time to see everyone's."}</small></span>
      </label>
      <p className="sq-ft-who">
        {c.shared.length > 0 && <span>Shared: {c.shared.map(n => n === api.you ? 'you' : n).join(', ')}</span>}
        {c.notShared.length > 0 && <span className="sq-ft-not">Not shared: {c.notShared.map(n => n === api.you ? 'you' : n).join(', ')}</span>}
      </p>
      {!c.locked && c.shared.length >= 2 && <>
        <div className="sq-days sq-ft-days" role="group" aria-label="Days with a time that works for everyone who shared">
          {days.map(d => {
            const [, , dd] = d.date.split('-').map(Number)
            return (
              <button key={d.date} type="button" className="sq-dayleaf" data-today={d.today || undefined} aria-pressed={d.date === chosen}
                aria-label={`${dayLabel(d.date, today)}: ${d.count ? `${d.count} ${d.count === 1 ? 'time' : 'times'} everyone is free` : 'no shared free time'}`}
                onClick={() => { setDay(d.date); if (band && band.date !== d.date) onBand?.(null) }}>
                <span className="sq-dayleaf-dow">{d.today ? 'Today' : dayLabel(d.date, today).slice(0, 3)}</span>
                <span className="sq-dayleaf-num">{dd}</span>
                <span className={`sq-ft-count${d.count ? '' : ' sq-ft-zero'}`} aria-hidden="true">{d.count || '·'}</span>
              </button>
            )
          })}
        </div>
        {/* Nov 26 (Cyn, item 8): the thin free-time bar was removed; the timetable below says the same, larger. */}
        {timetable?.(c, chosen, dayLabel(chosen, today))}
        {dayWindows.length ? (
          <ul className="sq-ft-list" aria-label={`Everyone who shared is free, ${dayLabel(chosen, today)}`}>
            {dayWindows.map(w => (
              <li key={w.start}>
                <b>{span(toMin(w.start), toMin(w.end))}</b>
                <button type="button" className="sq-dab-link" onClick={() => api.compose({ date: w.date, start: w.start, end: w.end, groupIds: [groupId] })}>Who's in?</button>
              </li>
            ))}
          </ul>
        ) : <p className="sq-ft-none">No time that works for everyone who shared, {dayLabel(chosen, today).toLowerCase()}.</p>}
        {c.windows.length > 0 && (
          <button type="button" className="sq-plan-button sq-ft-fit" onClick={() => { api.setGroupFit({ groupId, name: groupName, windows: c.windows }); window.location.hash = '#discover' }}>
            Events that fit everyone</button>
        )}
      </>}
      {!c.locked && c.shared.length < 2 && <p className="sq-ft-none">Nobody else has shared yet.</p>}
    </section>
  )
}

/** On Discover, while it shows what fits a whole group. */
export function GroupFitNote() {
  const api = useSocial()
  if (!api?.groupFit) return null
  return (
    <p className="sq-group-fit" role="status">
      <span>Fits everyone who shared in <b>{api.groupFit.name}</b></span>
      <button type="button" className="sq-text-button" onClick={() => api.setGroupFit(null)}>Back to my time</button>
    </p>
  )
}

export function WhosInButton({ slot }: { slot: Slot & { label: string } }) {
  const api = useSocial()
  if (!api) return null
  return <button type="button" className="sq-slip-act sq-slip-who" aria-label={`Who's in, ${slot.label}`} onClick={() => api.compose(slot)}>Who's in?</button>
}
