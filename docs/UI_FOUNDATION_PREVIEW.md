# SideQuest Campus Index: Cynthia UI foundation

**Status:** feature-branch UI slice and isolated preview, **not yet merged into M2**. The source of truth for M2 behavior remains [MVP Team Playbook](MVP_TEAM_PLAYBOOK.md); future maps, calendars, groups and extra credit remain in [Deep Research & Roadmap](DEEP_RESEARCH_PRODUCT_STRATEGY_2026.md).

## What this PR builds

- `app/src/view/DiscoverView.tsx`: accessible event list, selected-event detail, shared SideQuest header, empty/loading/error states, and an optional controlled Plan to attend button.
- `app/src/view/discover.css`: responsive SCU-inspired red/cream/gold editorial styling scoped to `.sq-discover-page`. No event photographs, category tags, account UI or pretend map/calendar controls.
- `app/discover-preview.html` + `app/src/discover-preview.tsx`: **isolated preview** that reads actual upcoming events from the M1 local browser store. Never seeds fake event data or claims the events are shared between browsers.
- `app/tests/discover.view.test.tsx`: selection by stable ID, duplicate titles, optional plan callbacks, missing descriptions/hosts, loading/error/empty handling, navigation and list changes.
- `app/vite.config.ts`: includes the preview page as a second build input. The production M1 entry still uses its original `index.html` and `App.tsx` until teammate integration.

## Preview it today

From `app/`:

```bash
npm ci
npm run dev
```

Open **http://localhost:5173/discover-preview.html**. The preview shows events from `sidequest.created-events.v1` **in that same browser**. If it looks empty, return to **http://localhost:5173/**, create a valid future event, then refresh the preview. The preview's **Find a time** and **Post an event** links return to the existing working M1 page. **My Schedule** and **Plan to attend** are deliberately not shown in this preview because PR #15 is not merged.

Run `npm test` and `npm run build`. The UI test data is fictional and stays in test code, not a public-event production fixture.

## Component contract for Devonny, Daven and Sembiyan

```tsx
<DiscoverView
  events={catalogEvents}     // CatalogPort.listUpcoming() output, from a controller
  loading={isLoading}
  error={errorMessage}
  onRetry={retryCatalog}
  onPlan={addPlanById}       // optional, wire after Schedule PR is merged
  plannedEventIds={ids}     // optional, from the local Schedule controller
  routes={{
    discover: '/discover',
    find: '/find',
    schedule: '/schedule',
    post: '/post',
  }}
/>
```

- `DiscoverEvent` accepts the current `CampusEvent` shape plus optional `hostName`. This keeps the view compatible with M1 records while Daven migrates toward the agreed M2 contract. When `hostName` is absent, the view says **Host not provided**, rather than inventing a verified organizer.
- Clicking an event selects it by **ID**, so duplicate titles remain distinct. The detail panel shows only supported fields: title, date, time, host (when available), location and description.
- `onPlan(eventId)` is a callback, never a direct storage/database call. The button appears only when the callback exists. `plannedEventIds` controls its disabled state. The parent/controller owns success/error feedback and persistence.
- `events` is already a filtered/listed result of the catalog read action; filtering, sorting, matching and storage stay outside the View. The isolated preview sorts already validated local events purely to simulate the planned catalog ordering.
- `SideQuestHeader` takes an explicit routes object, renders navigation only for connected routes, and allows `active='discover'|'find'|'schedule'|'post'`. No unsupported destination is displayed.
- CSS uses the `sq-` class prefix and remains scoped, to avoid unexpected changes to Sembiyan's Schedule or the current M1 form.

## Integration sequence

1. Review/merge PR #13, reconcile PR #15 with its final code and re-run both test suites.
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
