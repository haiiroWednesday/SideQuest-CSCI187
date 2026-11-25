// VIEW (design review only): Friends with many groups. Saved in this browser.
// The shipped group plans run through the authenticated gateway; this preview
// shows how several friend groups could look before the team decides the model.
import { useEffect, useMemo, useState } from 'react'
import { SideQuestHeader, type SideQuestRoutes } from './DiscoverView'
import { Greetings } from './Greetings'
import { categoryStyle } from './categoryColors'
import { categoryOfPlan } from '../controller/eventCategory'
import { FindATime, OpenInvites, useSocial } from './Social'
import type { OpenInvite } from '../controller/socialPlans'
import './friends.css'

type Answer = 'works' | 'if' | 'cant' | null
type Status = 'proposed' | 'confirmed' | 'cancelled'
// Only your own If note is ever stored here. Other people's notes are theirs alone (review v5.1, page 3).
// An open invite can become a plan with no catalog event: an activity with an optional place (review v5.1, page 1).
type Activity = { title: string; place?: string; date: string; start: string; end: string }
type Plan = { id: string; eventId: string; by: string; status: Status; answers: Record<string, Answer>; myNote?: string; activity?: Activity }
// `invited` are people who have not accepted yet. `inviteFrom` means you are the one invited and have not answered.
type Group = { id: string; name: string; members: string[]; invited: string[]; plans: Plan[]; inviteFrom?: string }
type Ev = { id: string; title: string; location: string; date: string; start: string; end: string; hostName?: string }

const KEY = 'sidequest.demo-friend-groups.v2'
const YOU = 'You'
/** Pending invitations plus members, you included, stay at 12 or fewer (review v5.1, page 3). */
export const GROUP_LIMIT = 12
const COLORS = ['#b8741f', '#5f6f30', '#3f5f7f', '#7a2e5a', '#a24a2c', '#3f6f66']
const ANSWERS: [Exclude<Answer, null>, string][] = [['works', 'Works'], ['if', 'If…'], ['cant', 'Cannot']]

function seed(): Group[] {
  // Sample plans point at the nth event, resolved when the list has loaded (it may be empty on first render).
  const e = (i: number) => `#${i}`
  return [
    { id: 'g1', name: 'Swig 7th floor', members: ['Maya', 'Jun', 'Theo', YOU], invited: [], plans: [
      { id: 'p1', eventId: e(5), by: 'Maya', status: 'proposed', answers: { Maya: 'works', Jun: 'if', Theo: null, [YOU]: null } },
      { id: 'p2', eventId: e(9), by: YOU, status: 'proposed', answers: { Maya: 'works', Jun: 'works', Theo: 'works', [YOU]: 'works' } }] },
    { id: 'g2', name: 'ACM crew', members: ['Priya', 'Sam', YOU], invited: ['Diego'], plans: [
      { id: 'p3', eventId: e(4), by: 'Priya', status: 'proposed', answers: { Priya: 'works', Sam: 'works', [YOU]: null } }] },
    { id: 'g3', name: 'Choir altos', members: ['Elena', 'Nora', YOU], invited: [], plans: [
      { id: 'p4', eventId: e(6), by: 'Elena', status: 'confirmed', answers: { Elena: 'works', Nora: 'works', [YOU]: 'works' } }] },
    { id: 'g4', name: 'Roommates', members: ['Talia', 'Andre', YOU], invited: [], plans: [] },
    // You were invited here. Until you accept you see the event and the invite, never who else is in it.
    { id: 'g5', name: 'Film club', members: ['Ana', 'Ben', 'Iris'], invited: [YOU], inviteFrom: 'Ana', plans: [
      { id: 'p5', eventId: e(7), by: 'Ana', status: 'proposed', answers: { Ana: 'works', Ben: null, Iris: 'if' } }] },
  ]
}
/** Friends who chose "Show my friends I'm going" on an event, for the group named. Sample data, like the groups. */
const SHARES: { name: string; groupId: string; eventId: string }[] = [
  { name: 'Jun', groupId: 'g1', eventId: '#3' }, { name: 'Theo', groupId: 'g1', eventId: '#3' },
  { name: 'Priya', groupId: 'g2', eventId: '#3' }, { name: 'Talia', groupId: 'g4', eventId: '#1' },
  // Ben's group only invited you, so you never see him.
  { name: 'Ben', groupId: 'g5', eventId: '#3' },
]
export const DEMO_YOU = YOU
export const personColor = (n: string) => n === YOU ? '#a32035' : COLORS[[...n].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length]
/** The sample groups and shares with "#n" event references turned into event IDs (the nth listed event). */
export function demoFriendData(events: readonly { id: string }[]) {
  const ref = (r: string) => {
    if (!r.startsWith('#') || !events.length) return r
    const i = Number(r.slice(1))
    return events[i % events.length]?.id ?? r
  }
  const groups = load().map(g => ({ ...g, plans: g.plans.map(p => ({ ...p, eventId: ref(p.eventId) })) }))
  return { groups, shares: SHARES.map(x => ({ ...x, eventId: ref(x.eventId) })) }
}

function load(): Group[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (Array.isArray(v) && v.length) return v as Group[]
  } catch { /* fall back */ }
  return seed()
}

export function FriendsPreview({ events, routes, plannedCount }: { events: readonly Ev[]; routes: SideQuestRoutes; plannedCount: number }) {
  const [groups, setGroups] = useState<Group[]>(load)
  const [active, setActive] = useState(groups[0]?.id ?? '')
  const [making, setMaking] = useState(false)
  const [name, setName] = useState('')
  const [people, setPeople] = useState('')
  const [proposing, setProposing] = useState('')
  const [leaving, setLeaving] = useState(false)
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(groups)) } catch { /* private mode */ } }, [groups])
  useEffect(() => setLeaving(false), [active])
  const byId = useMemo(() => {
    const m = new Map(events.map(e => [e.id, e]))
    events.forEach((e, i) => m.set(`#${i}`, e))
    for (let i = events.length; i < 12 && events.length; i++) m.set(`#${i}`, events[i % events.length])
    return m
  }, [events])
  const g = groups.find(x => x.id === active) ?? groups[0]
  const social = useSocial()
  // Opening Groups is reading the inbox.
  const markRead = social?.markRead
  useEffect(() => { markRead?.() }, [markRead, social?.unread])
  const planFromInvite = (inv: OpenInvite, groupId: string) => {
    const answers: Record<string, Answer> = Object.fromEntries((groups.find(x => x.id === groupId)?.members ?? []).map(m => [m, inv.joins.includes(m) || m === YOU ? 'works' : null]))
    const plan: Plan = { id: 'p' + Date.now(), eventId: inv.eventId ?? '', by: YOU, status: 'confirmed', answers,
      ...(inv.eventId ? {} : { activity: { title: inv.title, ...(inv.place ? { place: inv.place } : {}), date: inv.date, start: inv.start, end: inv.end } }) }
    setGroups(all => all.map(x => x.id === groupId ? { ...x, plans: [plan, ...x.plans] } : x)); setActive(groupId)
  }
  const color = personColor
  const update = (fn: (x: Group) => Group) => setGroups(all => all.map(x => x.id === g.id ? fn(x) : x))
  const updatePlan = (planId: string, fn: (p: Plan) => Plan) => update(x => ({ ...x, plans: x.plans.map(p => p.id === planId ? fn(p) : p) }))
  const setNote = (planId: string, text: string) => updatePlan(planId, p => ({ ...p, myNote: text }))
  // Any answer can change to any other while the plan is proposed. The note belongs to If only.
  const answer = (planId: string, a: Exclude<Answer, null>) => updatePlan(planId, p => p.status !== 'proposed' ? p : { ...p, answers: { ...p.answers, [YOU]: a }, myNote: a === 'if' ? p.myNote : undefined })
  const makeGroup = () => {
    const n = name.trim(); if (!n) return
    const id = 'g' + Date.now()
    const invited = [...new Set(people.split(',').map(s => s.trim()).filter(x => x && x !== YOU))].slice(0, GROUP_LIMIT - 1)
    setGroups(all => [...all, { id, name: n.slice(0, 40), members: [YOU], invited, plans: [] }]); setActive(id); setMaking(false); setName(''); setPeople('')
  }
  const propose = (eventId: string) => {
    if (!eventId || !g) return
    // Nobody has answered yet, the person who proposed it included (review v5.1, page 11).
    update(x => ({ ...x, plans: [{ id: 'p' + Date.now(), eventId, by: YOU, status: 'proposed', answers: Object.fromEntries(x.members.map(m => [m, null])) }, ...x.plans] }))
    setProposing('')
  }
  const accept = () => update(x => ({ ...x, inviteFrom: undefined, invited: x.invited.filter(m => m !== YOU), members: [...x.members, YOU],
    plans: x.plans.map(p => ({ ...p, answers: { ...p.answers, [YOU]: null } })) }))
  const decline = () => { setGroups(all => all.filter(x => x.id !== g.id)); setActive(groups.find(x => x.id !== g.id)?.id ?? '') }
  // Leaving deletes your membership. A confirmed plan that loses a member becomes cancelled for everyone left.
  const leave = () => { setGroups(all => all.filter(x => x.id !== g.id)); setActive(groups.find(x => x.id !== g.id)?.id ?? ''); setLeaving(false) }
  const dayName = (date: string) => { const [y, m, d] = date.split('-').map(Number); return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(Date.UTC(y, m - 1, d)).getUTCDay()] + ' ' + d }
  const fmt = (t: string) => { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}${m ? ':' + String(m).padStart(2, '0') : ''}${h < 12 ? 'am' : 'pm'}` }
  const pendingMe = Boolean(g?.inviteFrom)
  const confirmedHere = g?.plans.some(p => p.status === 'confirmed') ?? false

  return (
    <div className="sq-discover-page sq-friends-page">
      <SideQuestHeader routes={routes} active="groups" plannedCount={plannedCount} />
      <main className="sq-main" id="content">
        <div className="sq-fr">
          <div className="sq-fr-open"><OpenInvites onMakePlan={planFromInvite} /></div>
          <nav className="sq-fr-groups" aria-label="Your groups">
            <h1>Groups</h1>
            <p>Design preview: groups and responses stay in this browser. No invitations are sent.</p>
            <ul>{groups.map(x => (
              <li key={x.id}><button type="button" aria-current={x.id === g?.id ? 'true' : undefined} onClick={() => setActive(x.id)}>
                <b>{x.name}</b><span>{x.inviteFrom ? <em className="sq-fr-invited-tag">Invited by {x.inviteFrom}</em> : <>{x.members.length} people · {x.plans.length} {x.plans.length === 1 ? 'plan' : 'plans'}</>}</span>
              </button></li>))}</ul>
            {making ? (
              <form className="sq-fr-new" onSubmit={e => { e.preventDefault(); makeGroup() }}>
                <label>Group name<input value={name} maxLength={40} onChange={e => setName(e.target.value)} placeholder="Study buddies" autoFocus /></label>
                <label>Who's in it<input value={people} onChange={e => setPeople(e.target.value)} placeholder="Names, with commas" aria-describedby="sq-fr-limit" /></label>
                <small id="sq-fr-limit" className="sq-fr-limit">Up to {GROUP_LIMIT - 1} people. They join when they accept.</small>
                <div><button type="submit" className="sq-plan-button">Make the group</button><button type="button" className="sq-dab-link" onClick={() => setMaking(false)}>never mind</button></div>
              </form>
            ) : <button type="button" className="sq-dab-link" onClick={() => setMaking(true)}>New group</button>}
          </nav>
          {g && pendingMe && <section className="sq-fr-main sq-fr-invite" aria-labelledby="sq-fr-title">
            <span className="sq-fr-eyebrow">{g.inviteFrom} invited you</span>
            <h2 id="sq-fr-title">{g.name}</h2>
            {g.plans.slice(0, 1).map(p => { const e = byId.get(p.eventId); if (!e) return null
              return <div key={p.id} className="sq-fr-card sq-fr-invite-card" style={categoryStyle(categoryOfPlan({ title: e.title, host: e.hostName ?? '' }))}>
                <span className="sq-fr-time"><b>{fmt(e.start)}</b><small>to {fmt(e.end)}</small><em>{e.date.slice(5).replace('-', '/')}</em></span>
                <span className="sq-fr-body"><strong>{e.title}</strong><span>{e.location}</span></span>
                <span className="sq-fr-face" aria-hidden="true"><Greetings location={e.location} small /></span>
              </div> })}
            <div className="sq-fr-invite-acts">
              <button type="button" className="sq-plan-button" onClick={accept}>Join</button>
              <button type="button" className="sq-dab-link" onClick={decline}>No thanks</button>
            </div>
          </section>}
          {g && !pendingMe && <section className="sq-fr-main" aria-labelledby="sq-fr-title">
            <span className="sq-fr-eyebrow">{g.members.filter(m => m !== YOU).join(', ') || 'Just you'}{g.members.length > 1 ? ' and you' : ''}</span>
            <h2 id="sq-fr-title">{g.name}</h2>
            {g.invited.length > 0 && <p className="sq-fr-waiting"><i aria-hidden="true" />Invited, not in yet: {g.invited.join(', ')}</p>}
            <FindATime key={g.id} groupId={g.id} groupName={g.name} />
            {/* Find something to propose: type to search, or pick from what is coming up (replaces a long dropdown, Nov 24). */}
            <div className="sq-fr-find">
              <label className="sq-fr-find-box">
                <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="M12.5 12.5L17 17" /></svg>
                <span className="sq-visually-hidden">Find something to propose</span>
                <input type="search" value={proposing} onChange={e => setProposing(e.target.value)} placeholder="Find something to propose" />
              </label>
              {(() => {
                const q = proposing.trim().toLowerCase(), taken = new Set(g.plans.map(p => p.eventId))
                const hits = events.filter(e => !taken.has(e.id) && (!q || `${e.title} ${e.location} ${e.hostName ?? ''}`.toLowerCase().includes(q))).slice(0, q ? 8 : 3)
                return hits.length ? (
                  <ul className="sq-fr-hits" aria-label={q ? 'Matches' : 'Coming up'}>
                    {hits.map(e => (
                      <li key={e.id}>
                        <span className="sq-fr-hit-when"><b>{fmt(e.start)}</b>{dayName(e.date)}</span>
                        <span className="sq-fr-hit-what"><strong>{e.title}</strong><small>{e.location}</small></span>
                        <button type="button" className="sq-plan-button sq-fr-hit-go" onClick={() => propose(e.id)}>Propose<span className="sq-visually-hidden"> {e.title}</span></button>
                      </li>
                    ))}
                  </ul>
                ) : <p className="sq-fr-none">No match</p>
              })()}
            </div>

            {g.plans.map(p => { const e = byId.get(p.eventId) ?? (p.activity ? { id: '', title: p.activity.title, location: p.activity.place ?? 'Place to pick', date: p.activity.date, start: p.activity.start, end: p.activity.end } : undefined); if (!e) return null
              const works = g.members.filter(m => p.answers[m] === 'works').length
              const waiting = g.members.filter(m => p.answers[m] !== 'works').length + g.invited.length
              const locked = p.status !== 'proposed'
              return (
                <article key={p.id} className={`sq-fr-plan sq-fr-${p.status}`} style={categoryStyle(categoryOfPlan({ title: e.title, host: e.hostName ?? '' }))}>
                  <div className="sq-fr-card">
                    <span className="sq-fr-time"><b>{fmt(e.start)}</b><small>to {fmt(e.end)}</small><em>{e.date.slice(5).replace('-', '/')}</em></span>
                    <span className="sq-fr-body"><strong>{e.title}</strong><span>{e.location} · proposed by {p.by}</span>
                      {p.status === 'proposed' ? <i>{works} {works === 1 ? 'says' : 'say'} it works</i> : <b className={'sq-fr-status sq-fr-status-' + p.status}>{p.status === 'confirmed' ? 'Confirmed' : 'Cancelled'}</b>}</span>
                    <span className="sq-fr-face" aria-hidden="true"><Greetings location={e.location} small /></span>
                  </div>
                  <ul className="sq-fr-reps">{g.members.filter(m => m !== YOU).map(m => { const a = p.answers[m] ?? null
                    return <li key={m}><i style={{ background: color(m) }}>{m[0]}</i>{m}<span className={'sq-fr-a sq-fr-a-' + (a ?? 'none')}>{a && <AnswerStar kind={a} on small />}{a === 'works' ? 'Works' : a === 'if' ? 'If…' : a === 'cant' ? 'Cannot' : 'not yet'}</span></li> })}</ul>
                  <div className="sq-fr-mine" role="group" aria-label={`Your answer for ${e.title}`}><span>Your answer</span>
                    {ANSWERS.map(([k, label]) => <button key={k} type="button" className={'sq-ans sq-ans-' + k} aria-pressed={p.answers[YOU] === k} disabled={locked} onClick={() => answer(p.id, k)}><AnswerStar kind={k} on={p.answers[YOU] === k} />{label}</button>)}
                  </div>
                  {p.answers[YOU] === 'if' && !locked && (
                    <label className="sq-fr-note"><svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" /></svg>
                      <span className="sq-visually-hidden">Your condition, only you see it</span>
                      <input value={p.myNote ?? ''} maxLength={280} onChange={e => setNote(p.id, e.target.value)} placeholder="If… (only you see this)" />
                    </label>
                  )}
                  {p.by === YOU && p.status === 'proposed' && (
                    <div className="sq-fr-decide">
                      <button type="button" className="sq-plan-button" disabled={waiting > 0} aria-describedby={waiting > 0 ? `sq-fr-wait-${p.id}` : undefined}
                        onClick={() => updatePlan(p.id, x => ({ ...x, status: 'confirmed' }))}>Confirm</button>
                      {waiting > 0 && <small id={`sq-fr-wait-${p.id}`}>Waiting on {waiting}</small>}
                      <button type="button" className="sq-dab-link" onClick={() => updatePlan(p.id, x => ({ ...x, status: 'cancelled' }))}>Call it off</button>
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
