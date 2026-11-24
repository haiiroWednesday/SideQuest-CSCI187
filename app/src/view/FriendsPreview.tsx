// VIEW (design review only): Friends with many groups. Saved in this browser.
// The shipped group plans run through the authenticated gateway; this preview
// shows how several friend groups could look before the team decides the model.
import { useEffect, useMemo, useState } from 'react'
import { SideQuestHeader, type SideQuestRoutes } from './DiscoverView'
import { Greetings } from './Greetings'
import { categoryStyle } from './categoryColors'
import { categoryOfPlan } from '../controller/eventCategory'
import './friends.css'

type Answer = 'works' | 'if' | 'cant' | null
type Plan = { id: string; eventId: string; by: string; answers: Record<string, Answer>; note?: Record<string, string> }
type Group = { id: string; name: string; members: string[]; plans: Plan[] }
type Ev = { id: string; title: string; location: string; date: string; start: string; end: string; hostName?: string }

const KEY = 'sidequest.demo-friend-groups.v1'
const YOU = 'You'
const COLORS = ['#b8741f', '#5f6f30', '#3f5f7f', '#7a2e5a', '#a24a2c', '#3f6f66']
const ANSWERS: [Exclude<Answer, null>, string][] = [['works', 'Works'], ['if', 'If…'], ['cant', 'Cannot']]

function seed(events: readonly Ev[]): Group[] {
  // Sample plans point at the nth event, resolved when the list has loaded (it may be empty on first render).
  const e = (i: number) => `#${i}`
  return [
    { id: 'g1', name: 'Swig 7th floor', members: ['Maya', 'Jun', 'Theo', YOU], plans: [
      { id: 'p1', eventId: e(5), by: 'Maya', answers: { Maya: 'works', Jun: 'if', Theo: null, [YOU]: null }, note: { Jun: 'if I can leave lab early' } },
      { id: 'p2', eventId: e(9), by: 'Jun', answers: { Maya: 'works', Jun: 'works', Theo: 'cant', [YOU]: 'works' } }] },
    { id: 'g2', name: 'ACM crew', members: ['Priya', 'Sam', 'Diego', YOU], plans: [
      { id: 'p3', eventId: e(4), by: 'Priya', answers: { Priya: 'works', Sam: 'works', Diego: 'if', [YOU]: null } }] },
    { id: 'g3', name: 'Choir altos', members: ['Elena', 'Nora', YOU], plans: [
      { id: 'p4', eventId: e(6), by: 'Elena', answers: { Elena: 'works', Nora: null, [YOU]: null } }] },
    { id: 'g4', name: 'Roommates', members: ['Talia', 'Andre', YOU], plans: [] },
  ]
}
function load(events: readonly Ev[]): Group[] {
  const sample: Record<string, string> = { p1: '#5', p2: '#9', p3: '#4', p4: '#6' }
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    // Older saves stored an empty id when the list had not loaded yet; point those back at their sample event.
    if (Array.isArray(v) && v.length) return (v as Group[]).map(gr => ({ ...gr, plans: gr.plans.map(p => p.eventId ? p : { ...p, eventId: sample[p.id] ?? '' }) }))
  } catch { /* fall back */ }
  return seed(events)
}

export function FriendsPreview({ events, routes, plannedCount }: { events: readonly Ev[]; routes: SideQuestRoutes; plannedCount: number }) {
  const [groups, setGroups] = useState<Group[]>(() => load(events))
  const [active, setActive] = useState(groups[0]?.id ?? '')
  const [making, setMaking] = useState(false)
  const [name, setName] = useState('')
  const [people, setPeople] = useState('')
  const [proposing, setProposing] = useState('')
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(groups)) } catch { /* private mode */ } }, [groups])
  const byId = useMemo(() => {
    const m = new Map(events.map(e => [e.id, e]))
    events.forEach((e, i) => m.set(`#${i}`, e))
    for (let i = events.length; i < 12 && events.length; i++) m.set(`#${i}`, events[i % events.length])
    return m
  }, [events])
  const g = groups.find(x => x.id === active) ?? groups[0]
  const color = (n: string) => n === YOU ? '#a32035' : COLORS[[...n].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length]
  const update = (fn: (x: Group) => Group) => setGroups(all => all.map(x => x.id === g.id ? fn(x) : x))
  const setNote = (planId: string, text: string) => update(x => ({ ...x, plans: x.plans.map(p => p.id === planId ? { ...p, note: { ...(p.note ?? {}), [YOU]: text } } : p) }))
  const answer = (planId: string, a: Exclude<Answer, null>) => update(x => ({ ...x, plans: x.plans.map(p => p.id === planId ? { ...p, answers: { ...p.answers, [YOU]: p.answers[YOU] === a ? null : a } } : p) }))
  const makeGroup = () => {
    const n = name.trim(); if (!n) return
    const id = 'g' + Date.now()
    const members = [...people.split(',').map(s => s.trim()).filter(Boolean).slice(0, 12), YOU]
    setGroups(all => [...all, { id, name: n.slice(0, 40), members, plans: [] }]); setActive(id); setMaking(false); setName(''); setPeople('')
  }
  const propose = (eventId: string) => {
    if (!eventId || !g) return
    update(x => ({ ...x, plans: [{ id: 'p' + Date.now(), eventId, by: YOU, answers: Object.fromEntries(x.members.map(m => [m, m === YOU ? 'works' : null])) }, ...x.plans] }))
    setProposing('')
  }
  const dayName = (date: string) => { const [y, m, d] = date.split('-').map(Number); return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(Date.UTC(y, m - 1, d)).getUTCDay()] + ' ' + d }
  const fmt = (t: string) => { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}${m ? ':' + String(m).padStart(2, '0') : ''}${h < 12 ? 'am' : 'pm'}` }

  return (
    <div className="sq-discover-page sq-friends-page">
      <SideQuestHeader routes={routes} active="groups" plannedCount={plannedCount} />
      <main className="sq-main" id="content">
        <div className="sq-fr">
          <nav className="sq-fr-groups" aria-label="Your groups">
            <h1>Groups</h1>
            <ul>{groups.map(x => (
              <li key={x.id}><button type="button" aria-current={x.id === g?.id ? 'true' : undefined} onClick={() => setActive(x.id)}>
                <b>{x.name}</b><span>{x.members.length} people · {x.plans.length} {x.plans.length === 1 ? 'plan' : 'plans'}</span>
              </button></li>))}</ul>
            {making ? (
              <form className="sq-fr-new" onSubmit={e => { e.preventDefault(); makeGroup() }}>
                <label>Group name<input value={name} maxLength={40} onChange={e => setName(e.target.value)} placeholder="Study buddies" autoFocus /></label>
                <label>Who's in it<input value={people} onChange={e => setPeople(e.target.value)} placeholder="Names, with commas" /></label>
                <div><button type="submit" className="sq-plan-button">Make the group</button><button type="button" className="sq-dab-link" onClick={() => setMaking(false)}>never mind</button></div>
              </form>
            ) : <button type="button" className="sq-dab-link" onClick={() => setMaking(true)}>New group</button>}
          </nav>
          {g && <section className="sq-fr-main" aria-labelledby="sq-fr-title">
            <span className="sq-fr-eyebrow">{g.members.filter(m => m !== YOU).join(', ')} and you</span>
            <h2 id="sq-fr-title">{g.name}</h2>
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
            
            {g.plans.map(p => { const e = byId.get(p.eventId); if (!e) return null
              const works = Object.values(p.answers).filter(a => a === 'works').length
              return (
                <article key={p.id} className="sq-fr-plan" style={categoryStyle(categoryOfPlan({ title: e.title, host: e.hostName ?? '' }))}>
                  <div className="sq-fr-card">
                    <span className="sq-fr-time"><b>{fmt(e.start)}</b><small>to {fmt(e.end)}</small><em>{e.date.slice(5).replace('-', '/')}</em></span>
                    <span className="sq-fr-body"><strong>{e.title}</strong><span>{e.location} · proposed by {p.by}</span><i>{works} {works === 1 ? 'says' : 'say'} it works</i></span>
                    <span className="sq-fr-face" aria-hidden="true"><Greetings location={e.location} small /></span>
                  </div>
                  <ul className="sq-fr-reps">{g.members.filter(m => m !== YOU).map(m => { const a = p.answers[m] ?? null
                    return <li key={m}><i style={{ background: color(m) }}>{m[0]}</i>{m}<span className={'sq-fr-a sq-fr-a-' + (a ?? 'none')}>{a && <AnswerStar kind={a} on small />}{a === 'works' ? 'Works' : a === 'if' ? 'If…' : a === 'cant' ? 'Cannot' : 'not yet'}</span>{a === 'if' && p.note?.[m] && <em>{p.note[m]}</em>}</li> })}</ul>
                  <div className="sq-fr-mine" role="group" aria-label={`Your answer for ${e.title}`}><span>Your answer</span>
                    {ANSWERS.map(([k, label]) => <button key={k} type="button" className={'sq-ans sq-ans-' + k} aria-pressed={p.answers[YOU] === k} onClick={() => answer(p.id, k)}><AnswerStar kind={k} on={p.answers[YOU] === k} />{label}</button>)}
                  </div>
                  {p.answers[YOU] === 'if' && (
                    <label className="sq-fr-note"><svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" /></svg>
                      <span className="sq-visually-hidden">Your condition, only you see it</span>
                      <input value={p.note?.[YOU] ?? ''} maxLength={280} onChange={e => setNote(p.id, e.target.value)} placeholder="If… (only you see this)" />
                    </label>
                  )}
                </article>
              ) })}
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
