// DEV-ONLY LAB: shows the live path from data to interface.
//   1. what the catalog sends (fixtures, see scenarios.ts)
//   2. what the Controller hands the view (presentDiscover / presentSchedule)
//   3. what the real views draw, at desktop and phone width
// Drag or play the clock: the Controller re-runs and the views redraw.
// Plan and Remove clicks inside the views travel back up as plain IDs.
import { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { campusNow } from '../controller/postEvent'
import { calendarDay } from '../model/eventTiming'
import { displayDate, displayTime } from '../controller/findEvents'
import {
  presentDiscover, presentSchedule, type DiscoverScreen, type FreeWindow, type ScheduleScreen,
} from '../controller/presentScreens'
import { DiscoverView } from '../view/DiscoverView'
import { ScheduleTrailView } from '../view/ScheduleTrailView'
import { scenarios, scheduleFixture, shiftDate, type Scenario } from './scenarios'
import './lab.css'

type Kind = 'discover' | 'schedule'
type ToFrame = { kind: Kind; discover: DiscoverScreen; schedule: ScheduleScreen }
type FromFrame = { type: 'plan' | 'remove'; id: string } | { type: 'free'; window: FreeWindow }

const params = new URLSearchParams(location.search)
const ROUTES = { discover: '#discover', schedule: '#schedule', post: '#post' }
const FRAME_ORIGIN = window.location.origin

function todayISO(): string { return campusNow().date }

// Fixtures specify a campus wall clock. Resolve its UTC offset through Intl so
// this lab stays consistent on computers outside California, including DST.
function clockOf(s: Scenario, offset: number): Date {
  const wall = calendarDay(s.base).ordinal * 86_400_000 + (s.startAt + offset) * 60_000
  let instant = wall + 8 * 3_600_000
  for (let pass = 0; pass < 3; pass++) {
    const campus = campusNow(new Date(instant))
    const [hour, minute] = campus.time.split(':').map(Number)
    instant += wall - (calendarDay(campus.date).ordinal * 86_400_000 + (hour * 60 + minute) * 60_000)
  }
  return new Date(instant)
}

// ---------------------------------------------------------------- frame: renders one real view
// Opened on its own (no lab around it), a frame computes its screen from the URL:
// ?frame=1&s=busy&t=90&k=schedule&free=2026-11-04,14:00,16:00&seed=3
function standalone(): ToFrame {
  const all = scenarios(todayISO(), Number(params.get('seed') ?? 187))
  const s = all.find(x => x.id === params.get('s')) ?? all[0]
  const now = clockOf(s, Number(params.get('t') ?? 0))
  const [date = '', start = '', end = ''] = (params.get('free') ?? ',,').split(',')
  return {
    kind: (params.get('k') as Kind) ?? 'discover',
    discover: presentDiscover({ events: s.events, error: s.error, loading: s.loading, plannedIds: s.planned, freeWindow: { date, start, end }, now }),
    schedule: presentSchedule(scheduleFixture(s.events, s.planned, s.missing), now),
  }
}

function Frame() {
  const [state, setState] = useState<ToFrame | null>(() => (window.parent === window ? standalone() : null))
  useEffect(() => {
    if (window.parent === window) return
    const on = (event: MessageEvent<ToFrame>) => {
      if (event.origin === FRAME_ORIGIN && event.source === window.parent && event.data?.discover) setState(event.data)
    }
    window.addEventListener('message', on)
    window.parent.postMessage({ type: 'ready' }, FRAME_ORIGIN)
    return () => window.removeEventListener('message', on)
  }, [])
  const up = (message: FromFrame) => window.parent.postMessage(message, FRAME_ORIGIN)
  if (!state) return null
  return state.kind === 'discover' ? (
    <DiscoverView screen={state.discover} routes={ROUTES} onPlan={id => up({ type: 'plan', id })} onFreeWindowChange={window => up({ type: 'free', window })} />
  ) : (
    <ScheduleTrailView screen={state.schedule} routes={ROUTES} onRemove={id => up({ type: 'remove', id })} />
  )
}

// ---------------------------------------------------------------- the lab
function slimDiscover(screen: DiscoverScreen) {
  return {
    status: screen.status,
    headingText: screen.headingText,
    plannedCount: screen.plannedCount,
    freeWindow: screen.freeWindow && { active: screen.freeWindow.active, fitText: screen.freeWindow.fitText, error: screen.freeWindow.error },
    days: screen.days.map(day => ({
      tag: day.tag, long: day.long, ...(day.monthTag ? { monthTag: day.monthTag } : {}),
      events: day.events.map(e => ({
        id: e.id, start: e.start.time + e.start.ampm, end: e.endText, length: e.durationText,
        ...(e.live ? { live: e.live.text } : {}), ...(e.fit ? { fit: e.fit } : {}), ...(e.planned ? { planned: true } : {}), ...(e.host ? {} : { host: null }),
      })),
    })),
  }
}

function slimSchedule(screen: ScheduleScreen) {
  return {
    status: screen.status,
    counts: { planned: screen.plannedCount, overlap: screen.overlapCount, missing: screen.missingCount },
    nextUp: screen.nextUp && { id: screen.nextUp.stub.id, when: screen.nextUp.when, kind: screen.nextUp.kind },
    days: screen.days.map(day => ({
      tag: day.tag, long: day.long, ...(day.overlapNote ? { overlapNote: day.overlapNote } : {}),
      events: day.events.map(e => ({ id: e.id, start: e.start.time + e.start.ampm, ...(e.live ? { live: e.live.text } : {}), ...(e.overlap ? { overlap: e.overlap.text } : {}) })),
    })),
    done: screen.done.map(e => e.id),
    missing: screen.missing.map(m => m.id),
  }
}

// One stub or day per line, so a change of clock lights up exactly the lines that changed.
function lines(value: unknown): string[] {
  const out: string[] = []
  const walk = (v: unknown, pad: string, key: string) => {
    const label = key ? `${JSON.stringify(key)}: ` : ''
    if (Array.isArray(v) && v.some(x => typeof x === 'object' && x && 'events' in x)) {
      out.push(`${pad}${label}[`); v.forEach(x => walk(x, pad + '  ', '')); out.push(`${pad}]`)
    } else if (v && typeof v === 'object' && !Array.isArray(v) && 'events' in v) {
      const { events, ...rest } = v as { events: unknown[] }
      out.push(`${pad}${label}${JSON.stringify(rest).slice(0, -1)}, "events": [`)
      events.forEach(e => out.push(`${pad}    ${JSON.stringify(e)}`))
      out.push(`${pad}  ]}`)
    } else if (v && typeof v === 'object' && !Array.isArray(v) && pad === '') {
      out.push('{'); Object.entries(v).forEach(([k, x]) => walk(x, '  ', k)); out.push('}')
    } else out.push(`${pad}${label}${JSON.stringify(v)}`)
  }
  walk(value, '', '')
  return out
}

function Lab() {
  const [seed, setSeed] = useState(Number(params.get('seed') ?? 187))
  const all = useMemo(() => scenarios(todayISO(), seed), [seed])
  const [sid, setSid] = useState(params.get('s') ?? 'busy')
  const scenario = all.find(s => s.id === sid) ?? all[0]
  const [offset, setOffset] = useState(Number(params.get('t') ?? 0))
  const [kind, setKind] = useState<Kind>((params.get('k') as Kind) ?? 'discover')
  const [planned, setPlanned] = useState<string[]>(scenario.planned)
  const [missing, setMissing] = useState<string[]>(scenario.missing)
  const [free, setFree] = useState<FreeWindow>({ date: '', start: '', end: '' })
  const [playing, setPlaying] = useState(false)
  const span = 4 * 1440 - scenario.startAt - 60

  function selectScenario(nextScenario: Scenario) {
    setSid(nextScenario.id)
    setOffset(0)
    setPlanned(nextScenario.planned)
    setMissing(nextScenario.missing)
    setFree({ date: '', start: '', end: '' })
    setPlaying(false)
  }

  const now = clockOf(scenario, offset)
  const discover = presentDiscover({ events: scenario.events, error: scenario.error, loading: scenario.loading, plannedIds: planned, freeWindow: free, now })
  const schedule = presentSchedule(scheduleFixture(scenario.events, planned, missing), now)

  // Tell both frames what to draw whenever anything changes.
  const frames = [useRef<HTMLIFrameElement>(null), useRef<HTMLIFrameElement>(null)]
  const payload: ToFrame = { kind, discover, schedule }
  useEffect(() => {
    for (const frame of frames) {
      frame.current?.contentWindow?.postMessage(payload, FRAME_ORIGIN)
    }
  })
  useEffect(() => {
    function handleFrameMessage(event: MessageEvent<FromFrame | { type: 'ready' }>) {
      const knownFrame = frames.some(frame => frame.current?.contentWindow === event.source)
      if (event.origin !== FRAME_ORIGIN || !knownFrame) return

      const message = event.data
      if (message?.type === 'ready') {
        for (const frame of frames) {
          frame.current?.contentWindow?.postMessage(payload, FRAME_ORIGIN)
        }
      } else if (message?.type === 'plan') {
        setPlanned(previous => previous.includes(message.id) ? previous : [...previous, message.id])
      } else if (message?.type === 'remove') {
        setPlanned(previous => previous.filter(id => id !== message.id))
        setMissing(previous => previous.filter(id => id !== message.id))
      } else if (message?.type === 'free') {
        setFree(message.window)
      }
    }
    window.addEventListener('message', handleFrameMessage)
    return () => window.removeEventListener('message', handleFrameMessage)
  })

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      setOffset(previousOffset => {
        if (previousOffset + 15 > span) {
          setPlaying(false)
          return previousOffset
        }
        return previousOffset + 15
      })
    }, 220)
    return () => window.clearInterval(id)
  }, [playing, span])

  // Highlight lines that changed since the last clock position.
  const json = lines(kind === 'discover' ? slimDiscover(discover) : slimSchedule(schedule))
  const prev = useRef<string[]>([])
  // The first draw has nothing to compare with, so nothing lights up.
  const changed = new Set(prev.current.length ? json.filter(line => !prev.current.includes(line)) : [])
  useEffect(() => { prev.current = json })

  const shown = new Set(discover.days.flatMap(d => d.events.map(e => e.id)))
  const clockText = `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][calendarDay(campusNow(now).date).weekday]} ${displayDate(shiftDate(scenario.base, Math.floor((scenario.startAt + offset) / 1440))).slice(0, -5)}`
  const timeText = displayTime(campusNow(now).time)

  return (
    <div className="lab">
      <header className="lab-top">
        <h1>Data <em>→</em> Controller <em>→</em> View</h1>
        <div className="lab-chips" role="group" aria-label="Scenario">
          {all.map(s => <button key={s.id} className={s.id === scenario.id ? 'on' : ''} onClick={() => selectScenario(s)}>{s.label}</button>)}
          {scenario.id === 'random' && <button className="shuffle" onClick={() => setSeed(n => n + 1)}>Shuffle ↻</button>}
        </div>
        <div className="lab-clock">
          <button className="play" onClick={() => setPlaying(p => !p)} aria-label={playing ? 'Pause the clock' : 'Play the clock'}>{playing ? '❚❚' : '▶'}</button>
          <div className="readout"><b>{timeText}</b><span>{clockText}</span></div>
          <input type="range" min={0} max={span} step={5} value={offset} onChange={e => { setPlaying(false); setOffset(Number(e.target.value)) }} aria-label="California clock" />
          <div className="lab-tabs" role="group" aria-label="Screen">
            <button className={kind === 'discover' ? 'on' : ''} onClick={() => setKind('discover')}>Discover</button>
            <button className={kind === 'schedule' ? 'on' : ''} onClick={() => setKind('schedule')}>My Schedule</button>
          </div>
        </div>
      </header>

      <div className="lab-grid">
        <section className="lab-panel">
          <h2><i>1</i> The catalog sends</h2>
          {scenario.error ? <p className="lab-err">listUpcoming() failed: “{scenario.error}”</p> : scenario.events.length === 0 ? <p className="lab-dim">[ ] no events</p> : (
            <table>
              <tbody>
                {[...scenario.events].map(e => (
                  <tr key={e.id} className={kind === 'discover' && !shown.has(e.id) ? 'gone' : ''}>
                    <td>{e.date.slice(5).replace('-', '/')}</td><td>{e.start}–{e.end}</td><td>{e.title}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <h3>This device's plans</h3>
          <p className="lab-ids">{[...planned, ...missing].map(id => <code key={id} className={missing.includes(id) ? 'miss' : ''}>{id}</code>)}{planned.length + missing.length === 0 && <span className="lab-dim">none</span>}</p>
          <h3>California clock</h3>
          <p className="lab-ids"><code>{campusNow(now).date} {campusNow(now).time} California</code></p>
        </section>
        <section className="lab-panel lab-json">
          <h2><i>2</i> The controller hands the view</h2>
          <code className="lab-call">{kind === 'discover' ? 'presentDiscover({ events, plannedIds, freeWindow, now })' : 'presentSchedule(scheduleController.read(), now)'}</code>
          <pre>{json.map((line, i) => <span key={i} className={changed.has(line) ? 'flash' : ''}>{line}{'\n'}</span>)}</pre>
        </section>
        <section className="lab-views">
          <h2><i>3</i> The view draws</h2>
          <div className="lab-frames">
            <div className="frame desk"><iframe ref={frames[0]} src="/scenario-lab.html?frame=1" title="Desktop view" /></div>
            <div className="frame phone"><iframe ref={frames[1]} src="/scenario-lab.html?frame=1" title="Phone view" /></div>
          </div>
        </section>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(params.get('frame') ? <Frame /> : <Lab />)
