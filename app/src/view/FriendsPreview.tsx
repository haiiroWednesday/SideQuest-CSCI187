// VIEW (design review only): Friends with many groups. Loaded only in the design-review build
// (DesignReview.tsx, a dynamic import), so the shipped app never carries the sample groups.
// The state and every group rule live in controller/groupsPreview; this file draws them and passes taps back.
// If notes are shared with the group (Cyn, Nov 24): a condition is how members talk to each other.
import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { EventStub, SideQuestHeader, type SideQuestRoutes } from './DiscoverView'
import { Bookmark } from './Marks'
import { presentBrowseDetail, type StubModel } from '../controller/screenModels'
import { FindATime, OpenInvites, useSocial } from './Social'
import { BandFit, GroupTimetable } from './GroupTimetable'
import { GROUP_SIZE_LIMIT, YOU, answerOf, canConfirm, eventsInWindow, leaveCancels, noteOf, personColor, waitingOn, type Answer, type GroupsPreview } from '../controller/groupsPreview'
import type { Slot } from '../controller/socialPlans'
import './friends.css'

type Ev = { id: string; title: string; location: string; date: string; start: string; end: string; hostName?: string }
const ANSWERS: [Exclude<Answer, null>, string][] = [['works', 'Works'], ['if', 'If…'], ['cant', "Can't"]]

/** Every event in Groups is the same ticket as Discover and My Schedule (Nov 24). */
function GroupTicket({ stub, compact = false, children }: { stub: StubModel; compact?: boolean; children?: ReactNode }) {
  return (
    <EventStub face stub={stub} compact={compact} dated>
      {stub.planned && <span className="sq-planned-mark"><Bookmark label="In My Schedule" /></span>}
      {children}
    </EventStub>
  )
}

/** "You, Maya and Jun" or "You, Maya and 3 more": who is in a group, in the fewest words. */
const peopleLine = (members: readonly string[]): string => {
  const names = [...members].sort((a, b) => (a === YOU ? -1 : b === YOU ? 1 : 0))
  if (names.length <= 3) return names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
  return `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`
}

export function FriendsPreview({ events, routes, plannedCount, plannedIds = [], store }: { events: readonly Ev[]; routes: SideQuestRoutes; plannedCount: number; plannedIds?: readonly string[]; store: GroupsPreview }) {
  const ticketOf = (e: Ev) => presentBrowseDetail(e, plannedIds, new Date())
  useSyncExternalStore(store.subscribe, store.getState)
  const groups = store.visibleGroups()
  const [active, setActive] = useState(groups[0]?.id ?? '')
  const [making, setMaking] = useState(false)
  const [name, setName] = useState('')
  const [people, setPeople] = useState('')
  const [proposing, setProposing] = useState('')
  const [leaving, setLeaving] = useState(false)
  // The common stretch tapped on the group timetable: the propose list shows what fits it.
  const [band, setBand] = useState<Slot | null>(null)
  useEffect(() => { setLeaving(false); setBand(null) }, [active])
  const byId = useMemo(() => {
    const m = new Map(events.map(e => [e.id, e]))
    events.forEach((e, i) => m.set(`#${i}`, e))
    for (let i = events.length; i < 12 && events.length; i++) m.set(`#${i}`, events[i % events.length])
    return m
  }, [events])
  const g = groups.find(x => x.id === active) ?? groups[0]
  const social = useSocial()
  // Opening Groups is reading the inbox: once, and only while something is unread.
  const unread = social?.unread ?? 0, markRead = social?.markRead
  useEffect(() => { if (unread > 0) markRead?.() }, [unread, markRead])
  // The plan itself is made by the controller (Social's "Make it a plan"). Here we only show its group.
  const planFromInvite = (_inv: unknown, groupId: string) => setActive(groupId)
  const color = personColor
  const setNote = (planId: string, text: string) => store.setNote(g.id, planId, text)
  const answer = (planId: string, a: Exclude<Answer, null>) => store.answer(g.id, planId, a)
  const makeGroup = () => {
    const id = store.makeGroup(name, people); if (!id) return
    setActive(id); setMaking(false); setName(''); setPeople('')
  }
  const propose = (eventId: string) => {
    if (!eventId || !g) return
    store.propose(g.id, eventId)
    setProposing('')
  }
  const nextActive = () => groups.find(x => x.id !== g.id)?.id ?? ''
  const accept = () => store.accept(g.id)
  // No thanks: your invitation goes. Leave: your membership goes and a confirmed plan is cancelled for everyone left.
  const decline = () => { store.decline(g.id); setActive(nextActive()) }
  const leave = () => { store.leave(g.id); setActive(nextActive()); setLeaving(false) }
  const pendingMe = Boolean(g?.inviteFrom)
  const confirmedHere = g ? leaveCancels(g) : false

  return (
    <div className="sq-discover-page sq-friends-page">
      <SideQuestHeader routes={routes} active="groups" plannedCount={plannedCount} />
      <main className="sq-main" id="content">
        <div className="sq-fr">
          <div className="sq-fr-open"><OpenInvites onMakePlan={planFromInvite} /></div>
          <nav className="sq-fr-groups" aria-label="Your groups">
            <h1>Groups</h1>
            <p className="sq-fr-preview-note">Preview only. Nothing is sent.</p>
            <ul>{groups.map(x => (
              <li key={x.id}><button type="button" aria-current={x.id === g?.id ? 'true' : undefined} onClick={() => setActive(x.id)}>
                {/* Faces first: a row of the people in it is what makes this read as a group, not a filter. */}
                <span className="sq-fr-faces" aria-hidden="true">{x.members.slice(0, 5).map(m => <i key={m} style={{ background: personColor(m) }}>{m[0]}</i>)}{x.members.length > 5 && <i className="sq-fr-faces-more">+{x.members.length - 5}</i>}</span>
                <b>{x.name}</b><span>{x.inviteFrom ? <em className="sq-fr-invited-tag">Invited by {x.inviteFrom}</em> : <>{peopleLine(x.members)} · {x.plans.length} {x.plans.length === 1 ? 'plan' : 'plans'}</>}</span>
              </button></li>))}</ul>
            {making ? (
              <form className="sq-fr-new" onSubmit={e => { e.preventDefault(); makeGroup() }}>
                <label>Group name<input value={name} maxLength={40} onChange={e => setName(e.target.value)} placeholder="Study buddies" autoFocus /></label>
                <label>Who's in it<input value={people} onChange={e => setPeople(e.target.value)} placeholder="Names, with commas" aria-describedby="sq-fr-limit" /></label>
                <small id="sq-fr-limit" className="sq-fr-limit">Up to {GROUP_SIZE_LIMIT - 1} people. They join when they accept.</small>
                <div><button type="submit" className="sq-plan-button">Make the group</button><button type="button" className="sq-dab-link" onClick={() => setMaking(false)}>Never mind</button></div>
              </form>
            ) : <button type="button" className="sq-dab-link" onClick={() => setMaking(true)}>New group</button>}
          </nav>
          {g && pendingMe && <section className="sq-fr-main sq-fr-invite" aria-labelledby="sq-fr-title">
            <span className="sq-fr-eyebrow">{g.inviteFrom} invited you</span>
            <h2 id="sq-fr-title">{g.name}</h2>
            {g.plans.slice(0, 1).map(p => { const e = byId.get(p.eventId); if (!e) return null
              return <ul key={p.id} className="sq-stubs sq-stubs-one sq-fr-invite-card"><li><GroupTicket stub={ticketOf(e)}><span className="sq-fr-by">Proposed by {p.organizerId}</span></GroupTicket></li></ul> })}
            <div className="sq-fr-invite-acts">
              <button type="button" className="sq-plan-button" onClick={accept}>Join</button>
              <button type="button" className="sq-dab-link" onClick={decline}>No thanks</button>
            </div>
          </section>}
          {g && !pendingMe && <section className="sq-fr-main" aria-labelledby="sq-fr-title">
            <span className="sq-fr-eyebrow">{g.members.filter(m => m !== YOU).join(', ') || 'Just you'}{g.members.length > 1 ? ' and you' : ''}</span>
            <h2 id="sq-fr-title">{g.name}</h2>
            {g.invited.length > 0 && <p className="sq-fr-waiting"><i aria-hidden="true" />Invited, not in yet: {g.invited.join(', ')}</p>}
            <FindATime key={g.id} groupId={g.id} groupName={g.name} band={band} onBand={setBand}
              timetable={(common, date, day) => <GroupTimetable common={common} date={date} day={day} chosen={band} onBand={setBand} />} />
            {/* Find something to propose: type to search, or pick from what is coming up (replaces a long dropdown, Nov 24). */}
            <div className="sq-fr-find">
              <label className="sq-fr-find-box">
                <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="M12.5 12.5L17 17" /></svg>
                <span className="sq-visually-hidden">Find something to propose</span>
                <input type="search" value={proposing} onChange={e => setProposing(e.target.value)} placeholder="Find something to propose" />
              </label>
              {(() => {
                const q = proposing.trim().toLowerCase(), taken = new Set(g.plans.map(p => p.eventId))
                const pool = band ? eventsInWindow(events, band) : events
                const hits = pool.filter(e => !taken.has(e.id) && (!q || `${e.title} ${e.location} ${e.hostName ?? ''}`.toLowerCase().includes(q))).slice(0, q || band ? 8 : 3)
                return <>{band && <BandFit band={band} count={hits.length} onClear={() => setBand(null)} />}{hits.length ? (
                  <ul className="sq-stubs sq-stubs-one sq-fr-hits" aria-label={band ? 'Events that fit' : q ? 'Matches' : 'Coming up'}>
                    {hits.map(e => (
                      <li key={e.id}>
                        <GroupTicket compact stub={ticketOf(e)}>
                          <button type="button" className="sq-text-button sq-ink-act sq-fr-hit-go" onClick={() => propose(e.id)}>Propose<span className="sq-visually-hidden"> {e.title}</span></button>
                        </GroupTicket>
                      </li>
                    ))}
                  </ul>
                ) : !band && <p className="sq-fr-none">No match</p>}</>
              })()}
            </div>

            {g.plans.map(p => { const e = byId.get(p.eventId) ?? (p.activity ? { id: '', title: p.activity.title, location: p.activity.place ?? 'Place to pick', date: p.activity.date, start: p.activity.start, end: p.activity.end } : undefined); if (!e) return null
              const works = g.members.filter(m => answerOf(p, m) === 'works').length
              const waiting = waitingOn(g, p), mine = answerOf(p, YOU), myNote = noteOf(p, YOU)
              const locked = p.status !== 'proposed'
              return (
                <article key={p.id} className={`sq-fr-plan sq-fr-${p.status}`}>
                  <ul className="sq-stubs sq-stubs-one"><li>
                    <GroupTicket stub={ticketOf(e)}>
                      <span className="sq-fr-by">Proposed by {p.organizerId}</span>
                      {p.status === 'proposed' ? <i className="sq-fr-works">{works} {works === 1 ? 'says' : 'say'} it works</i> : <b className={'sq-fr-status sq-fr-status-' + p.status}>{p.status === 'confirmed' ? 'Confirmed' : 'Cancelled'}</b>}
                    </GroupTicket>
                  </li></ul>
                  <ul className="sq-fr-reps">{g.members.filter(m => m !== YOU).map(m => { const a = answerOf(p, m), note = noteOf(p, m)
                    return <li key={m}><i style={{ background: color(m) }}>{m[0]}</i>{m}<span className={'sq-fr-a sq-fr-a-' + (a ?? 'none')}>{a && <AnswerStar kind={a} on small />}{a === 'works' ? 'Works' : a === 'if' ? 'If…' : a === 'cant' ? "Can't" : 'No answer yet'}</span>{a === 'if' && note && <em className="sq-fr-their-note">{note}</em>}</li> })}</ul>
                  <div className="sq-fr-mine" role="group" aria-label={`Your answer for ${e.title}`}><span>Your answer</span>
                    {ANSWERS.map(([k, label]) => <button key={k} type="button" className={'sq-ans sq-ans-' + k} aria-pressed={mine === k} disabled={locked} onClick={() => answer(p.id, k)}><AnswerStar kind={k} on={mine === k} />{label}</button>)}
                  </div>
                  {mine === 'if' && !locked && (
                    <label className="sq-fr-note"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 3.5h11v7h-6l-3 2.5v-2.5h-2z" /></svg>
                      <span className="sq-visually-hidden">Your condition, your group sees it</span>
                      <input value={myNote ?? ''} maxLength={280} onChange={e => setNote(p.id, e.target.value)} placeholder="If… (your group sees this)" />
                    </label>
                  )}
                  {p.organizerId === YOU && p.status === 'proposed' && (
                    <div className="sq-fr-decide">
                      <button type="button" className="sq-plan-button" disabled={!canConfirm(g, p)} aria-describedby={waiting > 0 ? `sq-fr-wait-${p.id}` : undefined}
                        onClick={() => store.confirm(g.id, p.id)}>Confirm</button>
                      {waiting > 0 && <small id={`sq-fr-wait-${p.id}`}>Waiting on {waiting}</small>}
                      <button type="button" className="sq-dab-link" onClick={() => store.callOffPlan(g.id, p.id)}>Call it off</button>
                    </div>
                  )}
                </article>
              ) })}
            <div className="sq-fr-leave">
              {leaving
                ? <p role="alert">{confirmedHere ? 'Leaving cancels the confirmed plan for everyone. ' : ''}Leave {g.name}?
                    <button type="button" className="sq-plan-button" onClick={leave}>Leave</button>
                    <button type="button" className="sq-dab-link" onClick={() => setLeaving(false)}>Stay</button></p>
                : <button type="button" className="sq-dab-link" onClick={() => setLeaving(true)}>Leave group</button>}
            </div>
          </section>}
        </div>
      </main>
    </div>
  )
}

// Her stars, from the first Friends round: Works is a gold four-point star, If is the same star
// drawn in dotted lines (it might happen), Cannot is a smaller grey star struck through.
const STAR = 'M12 1.5C13.6 9.4 14.6 10.4 22.5 12C14.6 13.6 13.6 14.6 12 22.5C10.4 14.6 9.4 13.6 1.5 12C9.4 10.4 10.4 9.4 12 1.5Z'
function AnswerStar({ kind, on, small = false }: { kind: 'works' | 'if' | 'cant'; on: boolean; small?: boolean }) {
  const s = small ? 16 : 26
  return (
    <svg className={`sq-star sq-star-${kind}${on ? ' sq-star-on' : ''}`} width={s} height={s} viewBox="0 0 24 24" aria-hidden="true">
      {kind === 'cant'
        ? <g transform="translate(12 12) scale(.78) translate(-12 -12)"><path d={STAR} /><path className="sq-star-strike" d="M4 6L20 18" /></g>
        : <path d={STAR} />}
    </svg>
  )
}
