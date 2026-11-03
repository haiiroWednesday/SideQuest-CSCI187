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

The team-agreed MVP limit is **100 planned events**, defined by the
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
currently consumes the M1 browser-local event list. Once Daven's shared adapter
is integrated, supply the current catalog records to the Schedule Controller;
do not change the plan storage format or copy event records into plans.
The existing CampusEvent fields and catalog APIs are unchanged. No accounts,
saved availability records, public event deletion or database tables were added.

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
