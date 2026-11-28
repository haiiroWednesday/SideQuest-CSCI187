// VIEW: one quiet "what's open" line under a free stretch on Discover, e.g.
// "The Cellar is open until 11:59pm, 4 min walk". The controller picks the place and
// words it; this view only shows it and opens the walking route on our own map.
// The provider lives in DesignReview.tsx, loaded only in the design-review build.
import { createContext, useContext } from 'react'
import type { OpenIdea, Stretch } from '../controller/openNow'
import './open-now.css'

export type OpenNowApi = { ideaFor: (stretch: Stretch) => OpenIdea | null }
export const OpenNowContext = createContext<OpenNowApi | null>(null)

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
