# Sembiyan availability search and personal Schedule

## Behavior

Use **Find events** to enter one calendar date and a same-day free-time window.
An event matches only if its entire duration fits: an event ending at the
window's end is allowed; an event starting at the window's end is excluded.
Exact start/end matches are allowed. Invalid, empty, reversed or zero-length
windows produce a validation message rather than results.

Choose **Plan to attend** on a matching result or an event in the existing
created-event library. **My Schedule** (`#schedule`) is a separate page, ordered
by date, start time, end time and ID. Plans survive same-device reloads.
Removing a plan removes only its ID, never the original event.

Overlapping same-day events may both be planned. The add action warns the user,
and the Schedule marks affected events with another conflicting event's name.
Back-to-back events are allowed. Each event has one representative overlap
label, keeping dense schedules readable instead of listing every possible pair.
Missing catalog records have an unavailable entry that can still be removed.

The provisional MVP limit is **100 planned events**, pending whole-team
confirmation and recording in the team decision log. It is defined by the
`MAX_PLANNED_EVENTS` constant. A message appears when the limit is reached;
new additions are rejected until a plan is removed. Duplicate saves do not
consume another slot. Older schedules above 100 remain readable/removable and
are never silently truncated. Browser storage may still fill sooner. Failed
writes leave saved plans unchanged and report an error. Corrupt records are
never overwritten by reads or ordinary add/remove actions; recovery requires
explicit confirmation and preserves only valid, unique IDs.

## Model View Controller flow

- `src/model/events.ts` retains the existing full-fit and validation rules.
- `src/model/schedule.ts` owns plan identities, capacity, storage parsing/writes,
  chronological resolution and overlap detection. It imports no React code.
- `src/controller/personalSchedule.ts` mediates every Schedule read/change,
  resolves current catalog details and returns data plus action feedback.
- `src/view/PersonalSchedule.tsx` requests Controller operations and renders
  the Schedule page, controls and messages. It never imports Model functions,
  accesses localStorage, sorts events or compares their times directly.
- `src/App.tsx` connects the existing event source and hash navigation. The
  create/search flow and its existing Controller remain compatible with M1.

Plans use `sidequest.planned-event-ids.v1`, containing **IDs only**. They never
write `sidequest.created-events.v1`. Each action reads the latest stored IDs;
storage events refresh other open tabs. localStorage read/modify/write remains
best effort, not an atomic multi-tab database transaction.

## Integration boundary

The shared public catalog is not yet implemented on this branch. This feature
currently consumes the M1 browser-local event list. The array is a
complete local snapshot, not the result of an upcoming-only query. Do not pass
`listUpcoming()` results as a complete Schedule catalog: older planned events
may be absent from that list. Shared integration follows the handoff below;
keep the plan storage format as IDs rather than copying event records.
The existing CampusEvent fields and catalog APIs are unchanged. No accounts,
saved availability records, public event deletion or database tables were added.

## EventCatalogPort handoff for shared integration

This is a proposed integration checklist for Daven and the consuming features,
not a claim that the shared adapter or asynchronous Schedule UI exists here.
Use the existing playbook contract without adding another schema or port:
`getById(id): Promise<CampusEvent | null>` and
`listUpcoming(): Promise<CampusEvent[]>`.

- Resolve **every stored plan ID** with `getById()`, including IDs outside
  `listUpcoming()`. An older event remains a valid saved plan and keeps its
  chronological position. Use current catalog details when an event changes.
- While a lookup is pending, show a loading state. Keep its saved ID; do not
  temporarily call it unavailable or remove it from browser storage.
- A successful lookup returning an Event supplies the normal Schedule entry.
  Only a successful `null` result means the event is genuinely missing and
  should show **Event unavailable** with the option to remove the plan.
- A rejected request, timeout, or invalid response is a loading/network error,
  not evidence that an event is missing. Keep the plan and offer retry. These
  catalog errors are separate from damaged local plan-ID storage and must not
  trigger **Recover valid plans** or discard saved IDs.
- Preserve the View -> Controller -> Model boundary. The Controller coordinates
  asynchronous catalog reads and the View renders loading/error/missing states;
  React components must not query Supabase directly. Schedule removal writes
  only the local ID list and never deletes a catalog event.

Before replacing the local snapshot, jointly verify: an older saved event
outside the upcoming list still resolves; pending/rejected lookups never show
missing-event labels; a successful null response does; retry preserves IDs;
and removing a plan leaves the shared record readable from another browser.
No cross-browser M2 completion claim is made until that integration passes.

## PR 13 compatibility check

Checked on November 2, 2026 against current master `f3504f2` and the still-open
PR #13 head `e86835b`. A temporary source combination preserved PR #13's saved
versus unsaved tracking, cross-tab handling, Undo feedback, validation fixes,
and regression tests alongside this Schedule slice. The Schedule hook was
moved below the existing removal state to avoid competing insertions beside
PR #13's saved-state references; App.tsx and README combined without conflicts.

The temporary combination passed **130 tests**, the production build, and
**4 Chromium checks**, including the two-tab regression. Browser checks used a
dedicated server on port 5174 with server reuse disabled. This branch alone
passed **123 tests**, the build, and **3 Chromium checks**. Neither PR was merged
by this verification. Repeat integration checks if either branch changes before
merge; these results do not replace teammate approval.

The student walkthrough and whole-team confirmation of the provisional
100-plan limit remain pending human follow-ups. The shared catalog handoff
above still needs agreement with Daven before implementation.
## Verification

From `app/` run `npm test`, `npm run build` and `npm run test:e2e`.

New Model/Controller tests cover full-fit exact boundaries, touching intervals,
midnight/final-minute/leap dates, invalid input, duplicate IDs, chronological
order, current catalog details, missing records, corrupt/denied storage,
quota failures, other-tab updates, nested/chained overlaps, a full 100-event
schedule, rejection of the 101st plan, and adding again after removing a plan.

Rendered UI tests cover navigation, direct Schedule links, empty plans,
search-result additions, overlap alerts, reloads, safe removal and confirmed
recovery. The Chromium test performs create -> search -> add -> Schedule ->
reload -> remove, then verifies that the original event is still discoverable.
