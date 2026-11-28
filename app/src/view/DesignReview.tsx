// VIEW (design review only): the providers for Groups, open invites, friends going and "what's open",
// plus the Groups page. demo.tsx loads this file with a dynamic import; the shipped app (main.tsx)
// never does, so the sample groups and the browser-kept design-review state never reach production.
// One controller (controller/groupsPreview) feeds all three views, so a change in one shows in all.
import { createContext, useContext, useMemo, useState, useSyncExternalStore, type ComponentProps, type ReactNode } from 'react'
import { commonTime, visibleInvites, type Slot } from '../controller/socialPlans'
import { demoShares, initialSocial } from '../controller/socialStore'
import { friendsGoing, readGoingShares, sampleGoingTotal, writeGoingShares } from '../controller/friendsGoing'
import { openIdeaFor, type IdeaEvent } from '../controller/openNow'
import { createGroupsPreview, localGroupsPort, YOU, type GroupsPreview } from '../controller/groupsPreview'
import { SAMPLE_GOING, sampleGroups } from '../controller/groupsPreviewSample'
import { ComposeSheet, SocialContext, type Compose, type GroupFit, type SocialApi, type SocialEvent } from './Social'
import { GoingContext, type GoingApi } from './FriendsGoing'
import { OpenNowContext, type OpenNowApi } from './OpenNow'
import { FriendsPreview } from './FriendsPreview'

/** The design-review controller, made with this browser's storage and the sample groups. */
export function makeDesignReviewStore(now: () => Date): GroupsPreview {
  return createGroupsPreview({
    port: localGroupsPort(sampleGroups), now, initialSocial, sampleGoing: SAMPLE_GOING,
    going: { read: () => readGoingShares(), write: ids => writeGoingShares(ids) },
  })
}

const StoreContext = createContext<GroupsPreview | null>(null)

export function DesignReviewProviders({ events, plannedIds, now, myFree, groupFit, onGroupFit, store: given, children }: {
  events: readonly (SocialEvent & IdeaEvent)[]
  plannedIds: readonly string[]
  now: () => Date
  /** Your free stretches this week, from the day bar. Free/busy only. */
  myFree: readonly Slot[]
  groupFit: GroupFit | null
  onGroupFit: (fit: GroupFit | null) => void
  /** Tests pass their own; the demo makes one with this browser's storage. */
  store?: GroupsPreview
  children: ReactNode
}) {
  const [store] = useState(() => given ?? makeDesignReviewStore(now))
  const state = useSyncExternalStore(store.subscribe, store.getState)
  const [composing, setComposing] = useState<Compose | null>(null)
  const groups = store.socialGroups()
  // myFree is a new array each render: the memo keys on its content (freeKey), not its identity.
  const freeKey = JSON.stringify(myFree)

  const social = useMemo<SocialApi>(() => ({
    you: YOU, groups, now,
    invites: visibleInvites(state.social.invites, YOU, groups, now()),
    unread: store.unread(),
    markRead: store.markRead,
    compose: setComposing,
    join: store.join,
    leave: store.leaveInvite,
    callOff: store.callOff,
    planned: store.makePlan,
    sharing: gid => state.social.sharing.includes(gid),
    setSharing: store.setSharing,
    common: gid => {
      const g = groups.find(x => x.id === gid)
      if (!g) return { windows: [], shared: [], notShared: [], locked: true }
      return commonTime(g, demoShares(groups, YOU, myFree, state.social.sharing, now()), YOU, now())
    },
    groupFit, setGroupFit: onGroupFit,
  }), [store, state, groups, now, freeKey, groupFit, onGroupFit])

  const going = useMemo<GoingApi>(() => {
    const data = store.goingData(events)
    return {
      going: eventId => friendsGoing({ eventId, you: YOU, groups: data.groups, shares: data.shares, total: sampleGoingTotal(eventId) }),
      sharing: eventId => state.going.includes(eventId),
      setSharing: store.setGoing,
    }
  }, [store, state, events])

  const open = useMemo<OpenNowApi>(() => ({ ideaFor: stretch => openIdeaFor(stretch, { events, plannedIds, now: now() }) }), [events, plannedIds, now])

  return (
    <StoreContext.Provider value={store}>
      <GoingContext.Provider value={going}>
        <SocialContext.Provider value={social}>
          <OpenNowContext.Provider value={open}>{children}</OpenNowContext.Provider>
          {composing && <ComposeSheet api={social} events={events} start={composing}
            onSend={d => { store.send(d); setComposing(null) }} onClose={() => setComposing(null)} />}
        </SocialContext.Provider>
      </GoingContext.Provider>
    </StoreContext.Provider>
  )
}

/** The Groups page, on the same controller as the providers around it. */
export function GroupsPage(props: Omit<ComponentProps<typeof FriendsPreview>, 'store'>) {
  const store = useContext(StoreContext)
  return store ? <FriendsPreview {...props} store={store} /> : null
}

export type DesignReviewKit = { Providers: typeof DesignReviewProviders; GroupsPage: typeof GroupsPage }
export const kit: DesignReviewKit = { Providers: DesignReviewProviders, GroupsPage }
