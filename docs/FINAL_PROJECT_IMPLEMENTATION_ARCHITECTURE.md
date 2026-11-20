# SideQuest final project: implementation architecture contract

**November 20, 2026 | Status: proposed architecture handoff, reviewed against PRs #45–#54.**
**Read before extending the map or integrating the draft features.**
This document defines implementation boundaries and release gates, not approval to deploy unfinished features. Source of truth for shipped behavior is **`master`**; draft PRs are proposals until merged. Existing M2 functionality must continue working. Historical M2 ER/CRC diagrams remain historical artifacts.

## 0. What is already built, what is draft, what is missing

| Capability | Current truth | Source or next PR |
| --- | --- | --- |
| Public event occurrence (seven existing fields), strict full-fit search, Post and ID-based personal Schedule | **Merged**; events through EventCatalog/Node/Supabase or browser-local fallback, saved planned IDs localStorage | `app/src/model/eventCatalog.ts`, `app/server/api.ts`, `app/src/controller/sharedSchedule.ts` |
| Posting-only text policy | **Merged (#38)**; preserve its exact validations and SQL authorization | `supabase/migrations/`, regression tests |
| Discover fit explanations, duration-proportional timeline, accessible Schedule details, Someday | **Draft integrated slice (#49)** based on #45–#48; no account or shared plan claims | `app/src/model/fitAssessment.ts`, `app/src/model/someday.ts`, `app/src/controller/scheduleTimeline.ts` |
| Deterministic suggested categories, Google Calendar **draft** links, permissioned group-plan domain/service | **Draft expanded slice (#53)** integrating #50–#52; the group-plan service is not an exposed feature | `app/src/model/eventCategories.ts`, `app/src/controller/calendarExport.ts`, `app/src/model/groupPlans.ts`, `app/server/groupPlansService.ts` |
| SCU map link actions + pure graph shortest-path routine | **Draft map slice (#54)** on #53's integrated branch | `app/src/controller/campusMapLinks.ts`, `app/src/model/campusRoutes.ts` |
| Internal SCU campus map, verified walkway data, route overlay, place alias/entrance catalog, walking-aware FitChecker | **Not implemented** | Work packages below |
| Authenticated student accounts, durable private group planning, permissioned HTTP/RLS, realtime | **Not implemented** | Requires approved security architecture and live negative tests |
| Automatic event-source import, photo moderation and verified activity catalog | **Not implemented** | Independent approved follow-up |

**Do not merge #45–#48 and #49 separately, nor #50–#52 and #53 separately.** The integration branches already compose their descendants. Review one integrated path and merge/rebase once. #54 depends on #53 which depends on #49. Retarget and rerun *all* CI on the final combined SHA before release.

## 1. Product journeys and bounded contexts

1. **Discover public facts:** Find a specific upcoming **occurrence**, inspect verified catalog fields, filter by complete event-time window, learn why nonfits are excluded, save its UUID in My Schedule.
2. **Someday private intention:** Save an undated idea without fabricating a public event; optionally link a genuine catalog occurrence by stable UUID; defer/revisit. This remains device-local until identity and migration are approved.
3. **Campus map:** Resolve an event venue to a verified SCU Place and entrance; show the place on an interactive campus map; route from a deliberately selected origin across audited pedestrian edges; indicate unavailable/unknown otherwise.
4. **Travel-aware feasibility:** Compare an event's known interval with a selected origin, destination, walking profile and required arrival/departure buffers. **Keep the established time-only full-fit decision unchanged.**
5. **Collaborative plan:** A different, permissioned aggregate with organizer, participants, revision and their own explicit replies; merely saving an event is never a group RSVP. Until real sessions, policies, durable repository and two-account tests exist, group-plan code must remain unexposed.

**Domain boundaries:** Catalog (public occurrence and provenance), Personal Planning (saved IDs and Someday), Collaborative Planning (server-authoritative Plan), Campus (places, entrances, graph, routing), Feasibility (domain reasoning), Identity/Authorization (trusted principal and permission), Presentation (views/accessibility).

## 2. Dependency and responsibility rules

```text
React View / UI hooks
    -> Controller / Presenter -> use-case service -> pure Model rules
                                    |                  |
                                    +-> narrow ports --+-> storage/data providers
                                          -> EventCatalog adapter / Node API / Supabase
                                          -> personal localStorage adapter
                                          -> approved campus data repository

Browser View must not import Supabase clients, SQL, privileged credentials or
perform geographic calculations. Controllers create presentation-ready states.
Model algorithms must accept injected inputs, not read window, clock or network.
Shared data mutations must pass verified server authorization.
```

**Keep established naming and style:** `src/model/` for pure rules and stable contracts; `src/controller/` for orchestration/presenters; `src/view/` for UI/hooks/styles; `app/server/` for authenticated APIs and durable services; `app/tests/` for Vitest; `app/e2e/` for Playwright; `supabase/migrations/` for approved database changes. Prefer one small focused module per responsibility and reuse established types. Comments should explain *why*; avoid duplicate date parsing, new parallel Event repositories, hidden UI matching or an all-purpose `utils.ts`.

| Concept from ER/CRC | Responsibility and implementation rule |
| --- | --- |
| Event, EventCatalog | `EventCatalogPort` is current stable event boundary. An Event represents one **scheduled occurrence**, not an entire recurring series; do not replace UUIDs with titles |
| Schedule | Present locally saved event IDs. Removing a plan must never delete a public event |
| Someday / Intention | Independent private undated desire; link to a real occurrence only by stable ID |
| GroupPlan, Participant | Proposed shared choice, explicit response, organizer permissions, monotonic revision; **not** the M2 local saved-ID list |
| FitChecker | Pure feasibility decision with explicit unknowns; must not modify event or Plan records |
| Place | Canonical campus identity, aliases, venue references; contains no routing algorithm |
| Entrance | Usable, verified access to a Place; multiple entrances can exist |
| WalkNode, WalkEdge | Audited network connectivity and measured lengths, with access restrictions |
| CampusRoutingService / `findCampusWalk` | Pure graph traversal. Extend current model only after graph/data contract review |
| CampusMapController | Coordinate selected event, resolved Place, chosen origin, route state and time-fit state; construct URLs in controller, not View |
| CampusMapView | Render original licensed/authorized map layers, pins and route; keep an equivalent keyboard/text list |
| SourceRecord, Category, Photo, Report | Distinct future facts, classifiers, media and moderation state, never invented from a title or host text |
| Host, Student, Circle, Invitation | Future identified actor/organization/group contracts; possession of a name or link grants no permission |

### CRC and ER representation
- **Current-as-built diagrams** must show one public events table, event-service boundaries and localStorage planned IDs. Do not label Student, Plan, Source or a deployed walkway network “built.”
- **Conceptual ER** may add Place (1:N Entrances), WalkNodes (N:M through WalkEdges), events (N:0..1 resolved Place), and optional EventSeries (1:N EventOccurrences), but mark these **proposed** until implemented.
- Source URL/evidence identifiers belong with graph provenance. A shortest-path result is derived, not a permanent Place-to-Place `minutes` relationship. CRC must include routing and data review collaborators if these features ship.

## 3. SCU campus map: hard implementation contract

### 3.1 Place identity and matching
Preserve the host-provided `event.location` string verbatim. Never assert a canonical building ID from raw text alone.

Suggested staged, reviewable records (naming illustrative, not yet persisted):

```ts
type PlaceRecord = {
  id: string                       // stable, non-geographic identifier
  officialName: string
  aliases: string[]                // reviewed abbreviations and spelling variants
  kind: 'building' | 'outdoor' | 'other'
  entranceIds: string[]
  evidenceIds: string[]            // traceable official/authorized sources
}
type VenueResolution =
  | { kind: 'matched'; placeId: string; evidenceIds: string[] }
  | { kind: 'ambiguous'; candidates: string[] }
  | { kind: 'external'; originalLocation: string }
  | { kind: 'unknown'; originalLocation: string }
  | { kind: 'online' }
```

**Acceptance:** known supported aliases resolve deterministically; ambiguity does not select a random nearby building; unrecognized/off-campus/online venues remain truthfully unlocated within the custom map. Human reviewers must confirm the building names and entrances against SCU primary sources and on-campus checks. A room string may be preserved without claiming indoor walking support.

### 3.2 Campus graph and proof
The current `findCampusWalk` model has `CampusNode { id, label }` and `CampusWalkway {from,to,distanceMeters,accessible,closed,verified,evidence}`. It returns a path and measured distance **only when supplied a graph**. **Production currently supplies no real graph.** The tests are synthetic.

For a usable campus map, add a separately reviewed, versioned *data package*, conceptually:

```ts
type CampusDataset = {
  graphVersion: string
  checkedAt: string
  sources: Array<{ id: string; urlOrSurveyRecord: string; license: string; reviewedBy: string }>
  places: PlaceRecord[]
  entrances: Array<{ id: string; placeId: string; nodeId: string; stepFree: boolean | null }>
  nodes: Array<{ id: string; latitude: number; longitude: number; kind: string }>
  walkways: Array<{
    id: string; from: string; to: string; distanceMeters: number
    bidirectional: boolean; status: 'open' | 'closed' | 'unknown'
    stepFree: boolean | null; evidenceId: string; verifiedAt: string
  }>
}
```

This is a **proposed evolution**, not the current `CampusPedestrianGraph` type; implement a parser/normalizer rather than pretending it already exists.

**Critical graph refinements before field deployment:**
- The current routine automatically adds `from→to` and `to→from`. The real dataset must distinguish legitimately bidirectional paths from directional/restricted access and must account for entrance connectivity.
- `verified: true` plus a freeform `evidence` string is insufficient to certify real geography. Review source, licensing, measured lengths, entrances, direction, closures, step-free eligibility and version as **data governance**.
- `accessible: boolean` is too coarse for a real step-free promise. Treat **unknown** accessibility as unavailable for a step-free route; include stairs, kerbs/grades, construction, accessible entrances and temporary barriers where verified.
- Do not infer pedestrian links from geometric proximity or claim a straight-line distance is a walking route. No fabricated maps, times, survey dates or coordinates.
- Route results must identify a graph version, route node/path IDs, audited source provenance and warnings. A missing/disconnected graph produces an explicit unavailable state.
- Do not enable a “step-free” badge until route-wide eligibility and endpoints are human-checked.

### 3.3 Viewer and user experience
Create `CampusMapView` as a **real, interactive internal map** if approved data and licensing exist. A curated SVG overlay or Leaflet + original/appropriately licensed GeoJSON are both acceptable. Rendering choice is subordinate to verified geometry and a consistently accessible UI.

Core user actions:
1. From an event detail or Schedule entry, select **Show on campus map**.
2. If a canonical Place is known, center/highlight it; otherwise explain the unresolved venue and offer current **official SCU map / literal Google Maps search** links.
3. Select an **origin** manually from supported campus places, then choose a destination. Do not require GPS or request exact current location.
4. Display the calculated route with distance and **qualified** duration only when route metadata, selected pace and approved data support it. Unknown route/time must remain unknown.
5. Offer an equivalent step list, place search, accessible keyboard list and meaningful focus states. Pin color alone must not express feasibility.

Current #54 external links are **acceptable fallbacks** and may ship without claiming an internal map. Do not advertise “campus route directions” until the complete path, data and UI are demonstrable.

### 3.4 Travel-aware FitChecker
Preserve the existing strict rule `freeStart <= eventStart && eventEnd <= freeEnd` for the **event-only** view. Add a separate, testable result:

```ts
type TravelFit =
  | { kind: 'full'; routeVersion: string; inboundMinutes: number; outboundMinutes: number }
  | { kind: 'does_not_fit'; reasons: string[] }
  | { kind: 'unknown'; reasons: string[] }

type TravelFitInput = {
  freeStart: string; freeEnd: string
  eventStart: string; eventEnd: string | null
  originPlaceId: string | null
  destinationPlaceId: string | null
  returnPlaceId: string | null
  inboundRoute: unknown; outboundRoute: unknown
  arrivalBufferMinutes: number; departureBufferMinutes: number
}
```

Determine travel sufficiency with:
`freeStart + inboundTravel + arrivalBuffer <= eventStart`;
`eventEnd + outboundTravel + departureBuffer <= freeEnd`.
**These inequalities are only conclusive when all required locations, times and routes are known.** A missing end, unknown start point, unresolved venue, invalid route, unpublished closure or missing required return destination must produce `unknown`, not a fabricated full fit. Keep compatibility with existing `fitAssessment.ts` and do not reinterpret a same-day near miss as permission for partial attendance.

### 3.5 Data-source and legal boundaries
Use SCU's [official campus map](https://www.scu.edu/map/) and authorized campus facilities directory as primary *place-identification* references. Confirm permission to reuse or adapt any map illustration/geometry. If OSM geometry is used, preserve ODbL attribution and license obligations. Do not digitize Google map tiles or screenshot imagery into an independent dataset. Keep source URLs, reviewer, evidence/measurement method and last-checked date with every approved segment. Start with a geographically connected, human-checked **subset** of high-use event venues; expand only after verification.

## 4. Other final-project feature contracts

### Discover and categories (#49, #51, #53)
- Continue using real EventCatalog occurrences as the authoritative catalog. Category suggestions in #51 are conservative **heuristics from title/host**, not verified organizer labels. Unknown content belongs in `Other`; do not silently fabricate categories.
- Apply category and time filters as an intersection; retain event-only strict full-fit count and separate near-miss explanations. Neither a category label nor a partial overlap grants attendance permission.
- Normalize recurring event occurrences by stable per-session ID in any future import; do not group all performances into one ambiguous saved record.
- Explicitly distinguish a no-events state, no-fit state, error and loading state. Preserve current keyboard and narrow-screen interactions.

### Calendar drafts (#52, #53)
- `calendarExport.ts` generates a prefilled **Google Calendar draft URL only**. The user chooses whether to save it externally; SideQuest has no Google OAuth, read access or free/busy synchronization.
- Continue rejecting ambiguous/nonexistent California DST instants and unknown end times rather than guessing a UTC timestamp. Place wording should remain the original host-provided location until verified.
- No calendar credential, API integration or signup claim.

### Personal versus shared planning (#47, #50, #53)
- Someday and My Schedule are browser-local. Do not silently migrate or share personal intentions, notes or attendance.
- `groupPlans.ts` defines pure proposal/response rules; `app/server/groupPlansService.ts` demands a **verified server-side actor**, EventCatalog ID lookup, authorization before revision validation, and atomic repository compare-and-swap.
- **No current group-plan HTTP route, session provider, durable plan repository or live RLS** exists. Do not show the group feature as live or accept `actorId` from browser JSON.
- Planned eventual `group_plans`, `group_participants`, authenticated session, negative cross-account permission tests, revision concurrency and revoked-access tests require a separate approved migration and deployment review.
- The organizer does not get another student's private conditional note by default; a third-party viewer must not be able to probe plan existence or state.

### Source, Host, Category, Media, Reports, Circle, Invitation
These belong in the conceptual ER/CRC vision, **not** today's implementation claim. Separate entity identity from service calculations and authorization. Add persistent entities only when a tested use case and security/ownership contract need them.

## 5. Concrete implementation work orders (dependency order)

| Work order | Files/modules | Ready to claim when |
| --- | --- | --- |
| **W0: Repair integration** | #54 `app/e2e/schedule.spec.ts`; full stacked #49→#53→#54 test run | **All** unit, SQL, build, browser and a11y checks pass on the exact integrated head; manually inspect keyboard focus with map links |
| **W1: Verified place registry** | Proposed `src/model/campusPlaces.ts`, `src/controller/resolveVenue.ts`, reviewed `app/data/campus/` | Official place aliases/entrances with traceable source and unknown/ambiguous fallback; deterministic tests |
| **W2: Pedestrian graph** | Extend `campusRoutes.ts`, add validated versioned dataset loader, negative graph tests | Connected verified subset, correct direction, accessibility unknown state, no unverified shortcuts, provenance and human path checks |
| **W3: Interactive campus view** | `src/view/CampusMapView.tsx`, map styles, `src/controller/presentCampusMap.ts` | Verified pins, select/search/highlight, route and written directions, 320px/200%-zoom/keyboard checks |
| **W4: Event/Schedule connection** | `screenModels.ts`, event detail/Schedule integration, existing typed event IDs | Selecting event shows correct Place; mismatches remain unresolved and do not mutate source data |
| **W5: Travel-aware feasibility** | Extend `fitAssessment.ts` or add independent `travelFit.ts`, controller tests | Event-only fit unchanged; travel verdict correctly handles missing origin/end/paths/return needs |
| **W6: Shared planning deployment** | session design, repository, RLS, Node routes, two-user E2E | Independent authenticated users, negative permissions, atomic revisions, revoked sessions and real database test |
| **W7: Other expansions** | EventSeries/SourceRecord, media, moderation, circles, imports | Approved scope with separate schemas, permission model and acceptance evidence |

**Do not parallelize W3 and W5 against an invented campus graph.** Team members can work on UI fixtures and domain contracts independently, but route claims must wait for W1/W2 verified data. During reviews, Sembiyan validates time/routing semantics, Daven reviews persistence/security, Devonny validates Discover/map presentation, and the integration/QA owner reviews end-to-end consistency. These are provisional work allocations, not a claim of team approval.

## 6. Acceptance tests and release gate

Automated evidence must include:
- Place matching: official alias, ambiguous match, unknown, online, off-campus; no off-campus misattribution.
- Pathfinding: chosen shortest verified edge sequence; same-distance tie; disconnected edge; negative/NaN weight; impossible node ID; duplicate node; closed edge; unknown accessibility; one-way restriction; no surveyed map.
- Travel fit: exact boundary, one-minute miss, unknown end, unverified return, same-day clock/DST cases; unchanged M2 full-fit behavior.
- UI: card → map → Place → route → Schedule; mobile 320px, desktop, 200% zoom, keyboard and focus recovery, screen-reader readable route alternatives, no fake route when unavailable.
- Group service (until deployed only): unauthorized read/reply, private condition redaction, stale revision, duplicate invite, revoked membership, repository failure.
- Cross-layer regression: `npm run test:regression`, isolated SQL permissions, strict type/build and Playwright on the same final SHA. A local fixture is not a live deployment.

Manual evidence must include:
- Building/entrance/path correctness by actual SCU map and human route checks, including step-free routes if offered.
- Approved geometry and media licenses and attribution.
- Independent team review of changed CRC/ER/actual schema, with every class responsible for its own data and every collaborator traceable.
- Deployed Supabase migration and identity/authorization checks if those features are enabled.
- Representative student task sessions; successful CI is not evidence of a usable map.

**Ship rule:** If the surveyed SCU graph or usable map overlay is incomplete, ship only the truthful official-map/search actions. If authenticated group storage is incomplete, ship the individual Someday/Calendar/category features and retain the group code behind an unexposed service boundary. No claim of full campus routing, account security or automatic Calendar integration without demonstrated evidence.

## 7. New PR audit, November 20

- **#49** combines #45–#48 around current EventCatalog IDs and local storage. Consistent with this architecture as a demo candidate, subject to UI review and final integrated CI.
- **#50** protects authorization in its pure domain/service and does not expose group routes. Appropriate security restraint. Live sessions/RLS are unimplemented, so it is **foundation only**.
- **#51** category suggestions use title/host heuristics; visibly label them as suggestions and preserve strict-fit intersection.
- **#52** Calendar draft links use deterministic California-time rules; no OAuth or Calendar writes. Preserve accessibility/focus checks when adding new links.
- **#53** integrates #50–#52 into #49 with manually combined presenters. Uses correct module separation and preserves the M2 catalog. Review as one integrated branch rather than merging constituents twice.
- **#54** adds safe map link actions and a pure Dijkstra-style graph routine. It contains **no real SCU network or internal map renderer**. Its initial React CI failed two **existing** Schedule mobile-focus assertions because new map links changed tab order; updated tests must verify every enabled focus target and pass at the new head. Graph direction, surveyed evidence, entrance handling, source licensing and UI remain blocked future work. **Do not merge until green integrated CI and teammate review.**

## 8. Decisions requiring team sign-off

1. Exact list of verified SCU pilot venues/entrances and source-use permission, with named reviewer.
2. SVG-over-campus or Leaflet/GeoJSON renderer; the map must be custom enough to fit SideQuest and accessible with a list alternative.
3. Walking-profile semantics (step-free vs standard), measurement source and duration calibration; no inaccessible-route promises.
4. Whether any new feature needs a **new database table** this quarter, especially group plans. Current event schema must not be changed casually.
5. Whether the demonstration shows only truthful map fallbacks or an audited subset of real in-app routes. This decision must be based on data readiness, not mock screenshots.

**Related files:** `docs/FABLE_WHOLE_PRODUCT_ARCHITECTURE_REVIEW_2026-11-09.md` (long-term research), `docs/GROUP_PLAN_SECURITY_CONTRACT.md` (group security), `docs/REGRESSION_COVERAGE_MATRIX.md` (testing), `SPECIFICATIONS.md` (current behavior), PRs #49, #53 and #54 (actual integration).
