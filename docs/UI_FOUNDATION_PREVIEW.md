# SideQuest Campus Index: Cynthia UI foundation

**Status:** feature-branch UI slice, merged up to date with `master` (PR #15 Schedule, PR #18 EventCatalog, PR #19 posting, PR #22 release hardening) and running on those controllers in a preview page. `App.tsx` is unchanged; Devonny integrates the views there. The source of truth for M2 behavior remains the [MVP Team Playbook](MVP_TEAM_PLAYBOOK.md).

## Preview it

From `app/`:

```bash
npm ci
npm run dev
```

1. Open **http://localhost:5173/** and post an event with the existing form (Daven's posting controller).
2. Open **http://localhost:5173/discover-preview.html**: the event is there, read through the shared `useCatalogEvents(catalog)` snapshot. Without `app/.env.local` this is the labeled browser-only catalog; with Supabase settings it is the shared one.
3. Set **When are you free?**: only events that fit the whole window are listed, with **Show all events** to browse everything. **+ Plan to attend** goes through Sembiyan's Schedule controller.
4. **My Schedule** (`#schedule`) shows Next up, conflicts, plans whose details are unavailable, recovery for unreadable storage, and the plan limit notice, all from his controller.
5. **http://localhost:5173/scenario-lab.html** (dev only) shows catalog data, Controller output and both views side by side, with a draggable campus clock.

## How the pieces connect (Model → Controller → View)

The View never reads the clock, compares dates or times, touches storage or imports the Model. Every clock-driven label ("TODAY", "IN 9 DAYS", "Happening now · until 3:30pm", "Next up in 1 hr 30 min") is worked out in one Controller file and handed to the View as plain data. Time follows the contract: Santa Clara wall-clock values, through the Model's `campusNow()` and `isUpcoming()`, so a visitor in New York or Tokyo sees the same campus answer.

| File | Layer | Job |
|---|---|---|
| `app/src/controller/presentScreens.ts` | Controller | `presentDiscover({ events, plannedIds, freeWindow, showAll, loading, error, now })` and `presentSchedule(scheduleController.read().schedule, now, { loading, error })` return finished screen objects. Uses `campusNow`/`isUpcoming` (EventCatalog model) and `findEvents` (full-fit). |
| `app/src/view/DiscoverView.tsx` | View | Draws a `DiscoverScreen`. Exports `SideQuestHeader`, `EventStub`, `DayBubble`, and `useDiscoverScreen`, which re-asks the Controller every 30 seconds. On phones the picked event opens in a native modal `<dialog>` (Escape closes it, focus returns to the event). |
| `app/src/view/ScheduleTrailView.tsx` | View | Draws a `ScheduleScreen` and reports Remove, Recover and Retry back to the caller. |
| `app/src/view/discover.css`, `app/src/view/assets/` | View | Trail, ticket stubs, sticker ticket, dialog sheet and bottom tab bar, scoped under `.sq-discover-page`. |
| `app/discover-preview.html`, `app/src/discover-preview.tsx` | Entry | Preview page wired to `connectEventCatalog`, `loadPostedEvents` and `usePersonalSchedule`. |
| `app/scenario-lab.html`, `app/src/lab/` | Dev only | Fixture events (labeled, never stored) run through the real presenters and the real Schedule controller with in-memory storage. |
| `app/tests/present.screens.test.ts`, `discover.view.test.tsx`, `schedule.trail.view.test.tsx`, `catalog-to-screens.integration.test.ts`, `e2e/discover-preview.spec.ts` | Tests | Campus time from other visitor zones; the Model's end rule; separate and multiple conflicts; recovery and limit; catalog → Schedule → screens with the real modules; post → discover → match → plan → reload → remove in Chromium; phone dialog keyboard behavior. |

### Wiring it into the real app (Devonny owns `App.tsx`)

```tsx
const posted = useCatalogEvents(connection.catalog)                     // Daven's catalog snapshot
const plans = usePersonalSchedule(connection.catalog, posted.events, posted.revision, page === 'schedule')  // Sembiyan
const { events: catalogEvents, loading, error } = posted
const [freeWindow, setFreeWindow] = useState({ date: '', start: '', end: '' })
const [showAll, setShowAll] = useState(false)
const discover = useDiscoverScreen({ events: catalogEvents, loading, error, plannedIds: plans.schedule.ids, freeWindow, showAll })
<DiscoverView screen={discover} onPlan={plans.add} onRetry={reloadCatalog}
  onFreeWindowChange={w => { setFreeWindow(w); setShowAll(false) }} onShowAllChange={setShowAll}
  routes={{ discover: '/', schedule: '#schedule', post: '#post' }} />

const schedule = useScheduleScreen(plans.schedule, { loading: loading || plans.loading, error })
<ScheduleTrailView screen={schedule} onRemove={plans.remove} onRecover={plans.recover} onRetry={() => { posted.refresh(); plans.retryLookup() }}
  message={plans.message} warning={plans.warning ?? plans.lookupError} error={plans.error} routes={...} />
```

### Behavior decisions in this pass (from the two reviews)

- **Free time filters.** A complete window lists only events that fit; the bar says how many and offers **Show all events**. Nothing fits → a message naming the window, with **See all upcoming events** and **Clear the window**. Nothing is faded.
- **Conflicts.** A plan stub only says **Overlaps**; its details list every clash with its own time. The day note says how many plans overlap, never one merged range.
- **Unavailable plans.** Said only after the catalog has answered. While it loads: "Looking up your planned events"; if it fails: "Your plans are safe, but their details could not be loaded" with **Try again**. A plan the loaded catalog does not contain is **An event you planned · It may have ended or been taken down**.
- **Phone details** use `<dialog>.showModal()`: focus stays inside, Escape closes, focus returns to the stub, and the closed sheet is out of the tab order.

### Resolved during this pass

- The catalog/Schedule description-limit mismatch (2000 vs 500) was fixed on `master` in #22; `tests/catalog-to-screens.integration.test.ts` now plans a 501-character event successfully.
- Plans whose events have ended now resolve through `getById` (#22), so they appear under **Already happened** instead of as unavailable.

### Still open for the team

- **Copy.** "Plan to attend" may read as registration. A reviewer suggested "Save to My Schedule"; this button and Sembiyan's should use the same words.
- **Post page.** The Post mockup in the design system now marks host and description required, as the contract does. The live form is Daven's `PostEventForm`.

## Integration sequence

1. Done in this pass: merged `master` (#15, #18, #19) and wired the preview to those controllers.
2. Agree on the final shared `CampusEvent` contract (including `hostName` and description-length limit) with Daven.
3. Devonny integrates `DiscoverView` into a single owner-edited `App.tsx`/navigation flow, supplying the actual `EventCatalogPort.listUpcoming()` results. Keep loading, network failures and genuinely missing records distinct.
4. Sembiyan connects `onPlan` and `plannedEventIds` through the Schedule controller; never duplicate plan state inside the view. Preserve the fully-fitting search behavior.
5. Test posting in Browser A and viewing in Browser B, then adding/removing a plan locally without deleting the public event.
6. After integration, remove the temporary preview entry and its extra Vite input **if the team no longer needs it**. This should be an intentional follow-up, not part of the initial isolated UI PR.

## Quality and future-readiness checks

- Responsive at desktop widths and 375px; long names wrap instead of hiding identity.
- Native buttons and links with visible focus rings; selected state exposed through `aria-pressed`.
- Text-only event content, not assumed photos/costs/categories or profiles.
- Map, transit, calendar integration, intentions and plan repair later need new domain data and feature routes; the view accepts data/handlers through props and can be extended without entangling SQL or storage in React.
- The decorative mission-arcade illustration is original abstract SVG, not an official SCU seal or an assertion of university sponsorship.
