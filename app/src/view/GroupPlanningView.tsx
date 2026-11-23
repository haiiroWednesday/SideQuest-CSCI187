// VIEW: optional authenticated group page. A verified sign-in provider supplies
// actorId and the typed GroupClientPort. No token input or localStorage auth.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  GroupAction, GroupClientPort, GroupDetail, GroupSummary,
} from '../controller/groupClient'
import type { CampusEvent } from '../controller/postEvent'
import { SideQuestHeader, type SideQuestRoutes } from './DiscoverView'
import { GroupPlanPanel } from './GroupPlanPanel'
import './group-planning.css'

function displayError(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message : 'Group planning is unavailable. Try refreshing.'
}

export type GroupPlanningViewProps = {
  actorId: string
  client: GroupClientPort
  events: readonly CampusEvent[]
  routes: SideQuestRoutes
}

export function GroupPlanningView({ actorId, client, events, routes }: GroupPlanningViewProps) {
  const [groups, setGroups] = useState<GroupSummary[]>([])
  const [selected, setSelected] = useState<GroupDetail | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [eventId, setEventId] = useState('')
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const generation = useRef(0)

  const eventNames = useMemo(
    () => new Map(events.map(event => [event.id, event.title])),
    [events],
  )

  const refreshList = useCallback(async () => {
    const current = ++generation.current
    setLoading(true)
    setError(null)
    try {
      const result = await client.list()
      if (generation.current === current) setGroups(result)
    } catch (problem) {
      if (generation.current === current) setError(displayError(problem))
    } finally {
      if (generation.current === current) setLoading(false)
    }
  }, [client])

  useEffect(() => {
    void refreshList()
    return () => { generation.current++ }
  }, [refreshList])

  const open = async (id: string) => {
    const current = ++generation.current
    setLoading(true)
    setActiveId(id)
    setError(null)
    setSelected(null)
    try {
      const plan = await client.get(id)
      if (generation.current === current) setSelected(plan)
    } catch (problem) {
      if (generation.current === current) setError(displayError(problem))
    } finally {
      if (generation.current === current) setLoading(false)
    }
  }

  const create = async () => {
    if (!eventId || busy || !events.some(event => event.id === eventId)) return
    const current = generation.current
    setBusy(true)
    setError(null)
    try {
      const plan = await client.create(eventId)
      // A completed write must not replace a newer selection.
      if (generation.current === current) {
        setSelected(plan)
        setActiveId(plan.id)
        setGroups(old => [plan, ...old.filter(item => item.id !== plan.id)])
      }
    } catch (problem) {
      if (generation.current === current) setError(displayError(problem))
    } finally {
      setBusy(false)
    }
  }

  const act = async (command: GroupAction) => {
    const plan = selected
    if (!plan || busy || !activeId || plan.id !== activeId) return
    const current = generation.current
    setBusy(true)
    setError(null)
    try {
      const latest = await client.act(plan.id, command)
      // An old reply must not replace a newer selection or tab session.
      if (generation.current === current && activeId === latest.id) {
        setSelected(latest)
        setGroups(old => old.map(row => row.id === latest.id ? latest : row))
      }
    } catch (problem) {
      // Stale/denied updates remain visible only while this plan is current.
      if (generation.current === current) setError(displayError(problem))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="sq-discover-page sq-group-page">
      <SideQuestHeader routes={routes} active="groups" />
      <main className="sq-main" id="content">
        <section className="sq-hero" aria-labelledby="sq-group-page-title">
          <h1 id="sq-group-page-title">Plan <em>together.</em></h1>
          <p>Invitations and responses belong to verified participants. A group proposal does not register anyone for an event.</p>
        </section>
        {/* The selected plan owns its action error. Announce it only once. */}
        {error && !selected && <p role="alert" className="sq-group-error">{error}</p>}
        <div className="sq-group-page-layout">
          <section aria-labelledby="sq-group-list-title" className="sq-group-sidebar">
            <h2 id="sq-group-list-title">Your group outings</h2>
            <button type="button" className="sq-group-link" onClick={() => { void refreshList() }}
              disabled={loading || busy}>Refresh group list</button>
            {loading && <p role="status">Loading group plans…</p>}
            {!loading && !error && groups.length === 0 && <p>No shared plans yet.</p>}
            <ol>
              {groups.map(plan => (
                <li key={plan.id}>
                  <button type="button" className="sq-group-list-choice"
                    aria-current={activeId === plan.id ? 'true' : undefined}
                    disabled={busy}
                    onClick={() => { void open(plan.id) }}>
                    <strong>{eventNames.get(plan.eventId) ?? 'Campus event'}</strong>
                    <span>{plan.status}</span>
                  </button>
                </li>
              ))}
            </ol>
          </section>
          <div className="sq-group-main">
            <section className="sq-group-new" aria-labelledby="sq-group-new-title">
              <h2 id="sq-group-new-title">Propose a group outing</h2>
              <label htmlFor="sq-group-event">Choose a real campus event</label>
              <select id="sq-group-event" value={eventId} onChange={e => setEventId(e.target.value)}
                disabled={busy || events.length === 0}>
                <option value="">Choose an event</option>
                {events.map(event => <option key={event.id} value={event.id}>{event.title}</option>)}
              </select>
              <button type="button" disabled={!eventId || busy} onClick={() => { void create() }}>
                {busy ? 'Saving…' : 'Create group proposal'}
              </button>
            </section>
            {selected && <GroupPlanPanel
              key={selected.id} plan={selected} actorId={actorId}
              eventTitle={eventNames.get(selected.eventId) ?? 'Campus event'}
              busy={busy} error={error}
              onAction={command => { void act(command) }}
              onRefresh={() => { void open(selected.id) }}
            />}
            {!selected && !loading && !error && <p className="sq-group-empty">Select a plan above to review invitations and responses.</p>}
          </div>
        </div>
      </main>
      <footer className="sq-footer"><span>SideQuest</span><span>Santa Clara · California</span></footer>
    </div>
  )
}
