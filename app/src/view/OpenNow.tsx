// VIEW: one quiet "what's open" line under a free stretch on Discover, e.g.
// "The Cellar is open until 11:59pm, 4 min walk". The controller picks the place and
// words it; this view only shows it and opens the walking route on our own map.
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { openIdeaFor, type IdeaEvent, type OpenIdea, type Stretch } from '../controller/openNow'
import './open-now.css'

type Ctx = { ideaFor: (stretch: Stretch) => OpenIdea | null } | null
const OpenNowContext = createContext<Ctx>(null)

export function OpenNowProvider({ events, plannedIds, now, enabled, children }: {
  events: readonly IdeaEvent[]; plannedIds: readonly string[]; now: () => Date; enabled: boolean; children: ReactNode
}) {
  const value = useMemo<Ctx>(() => enabled
    ? { ideaFor: stretch => openIdeaFor(stretch, { events, plannedIds, now: now() }) }
    : null, [enabled, events, plannedIds, now])
  return <OpenNowContext.Provider value={value}>{children}</OpenNowContext.Provider>
}

export function OpenNowLine({ slot }: { slot: Stretch }) {
  const ctx = useContext(OpenNowContext)
  const idea = ctx?.ideaFor(slot) ?? null
  if (!idea) return null
  return (
    <a className="sq-open-now" href={`#walk/${encodeURIComponent(idea.mapLabel)}`}
      aria-label={`${idea.text}. Show the walk to ${idea.mapLabel} on the SideQuest map`}>
      <svg className="sq-open-now-sign" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 9.5h14v9H5z" /><path d="M8.5 9.5 12 4.5l3.5 5" /><path d="M8 14h8" />
      </svg>
      <span className="sq-open-now-text">{idea.text}</span>
    </a>
  )
}
