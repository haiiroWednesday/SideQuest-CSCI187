# SideQuest: User Requirements (final project)

**Updated November 26, 2026.** This replaces the M2 MVP contract of November 4. The M2 version is kept in Git history, and the M1 requirements stay in [docs/M1_HISTORICAL_REQUIREMENTS.md](docs/M1_HISTORICAL_REQUIREMENTS.md). Anything the team agreed on but has not built is listed under **Deferred**, with the reason. Nothing agreed has been dropped without a note there.

## R1: Post a campus event
- A student can post an event with a title, host name, description, location, day, start and end time.
- A student can say whether people must come for the whole event (set time) or can drop in.
- A student gets clear feedback on each invalid or missing field, and what they typed is kept when a post fails.
- Events can be dated from today through one year ahead in Santa Clara time. An event posted for today must not have started yet.
- Posts are limited to a title of 80 characters, a host name of 60, a location of 120 and a description of 1,000. The title, host and location must each contain a letter or number in any language.
- The host name is display text. It is not a verified organizer identity.

**Acceptance:** A valid future post succeeds and survives reload. Yesterday, more than a year ahead, a past start today, blank fields, text over the limits, symbol-only names and reversed times are rejected. A failed save says so and never claims success.

## R2: Discover events
- A student can see upcoming events grouped by day, with title, host, place, date and time.
- Two students see the same events when the shared catalog is configured, and a new post appears for the other student without a reload.
- Official SCU calendar events appear next to student posts, each with a link to its source.
- A student can filter by one or more categories.
- Loading, empty and failure states are honest and offer a retry.
- Every scheduled showing is its own event with its own ID, even when titles repeat.

## R3: Find events that fit free time
- A student can mark when they are busy on one or more days, by dragging on the day bar or typing times.
- A student can bring in busy time from a calendar file, a typed or spoken sentence, or Google Calendar, and checks every proposed block before it is added.
- My Schedule's plans already count as busy.
- A set-time event fits only when the whole event sits inside a free stretch. Equal boundaries count.
- A drop-in event fits when it shares at least 20 minutes with a free stretch.
- Each showing is checked on its own. A production never fits because one of its other showings does.
- Without busy time, Discover shows everything upcoming. Clearing busy time returns to that view without changing plans.

**Acceptance:** A 2:30–3:30pm set-time event fits 2–4pm and 2:30–3:30pm, and does not fit 3–4pm or another day. With showings Fri 8pm, Sat 2–4pm, Sat 7:45pm and Sun 2pm, free time of Sat 1–5pm fits only the Sat 2–4pm showing.

## R4: Plan and revisit My Schedule
- A student can add an event to My Schedule and see plans in time order, on a timeline and as tickets.
- Adding the same event twice does not duplicate it. Removing a plan never deletes the public event.
- A signed-in student's plans follow them across devices. Without signing in, plans stay on this device.
- Overlapping plans are shown side by side without blocking the student.
- When a saved event can no longer be found, the student is told that it may have been cancelled or moved. A network failure is never shown as a missing event.

## R5: Keep Someday ideas
- A student can save an idea that has no date ("try rock climbing"), describe it in their own words, and later link it to a real listed event.
- An idea never becomes a public event.

## R6: Plan with friends
- A student signs in with a scu.edu email code. No password is stored by SideQuest.
- A student can belong to several groups, invite friends, and propose an event to a group.
- Each member answers Works, If (with an optional note the group can see) or Cannot. An invitation never counts as a yes.
- A student sees which friends are going only inside groups they belong to, and only for friends who chose to show it.

## R7: See events on the campus map
- A student can see their own plans and posts on an SCU campus map, and open an event's building from its ticket.
- Walking directions use only verified paths. Without one, SideQuest says the route is unknown and never invents a time.

## R8: Get optional AI help
- A student can describe busy time or a Someday idea in plain words and get a draft to check before anything is saved.
- AI suggestions only point to real catalog events, and the normal fit rules still decide what fits.
- When the AI service is off or fails, the same tasks still work without it.

## R9: Dependable, secure and usable
- The app works with a keyboard and a screen reader, stays readable on phones, and can be installed as a home-screen app.
- Views talk to Controllers. Controllers coordinate. Models own rules and data.
- Every core feature has normal, boundary, invalid and failure tests. CI builds the app and runs unit, browser and SQL tests on every push.
- All database, AI and Google keys stay on the Node server. The browser bundle is scanned for credentials on every build.

## Deferred: agreed, not built yet

These were agreed or decided earlier. They stay requirements for later work.

| Requirement | Agreed | Where it stands | Why it waits |
| --- | --- | --- | --- |
| One production card with a showtime picker, instead of one ticket per showing | Nov 9 | Each showing is its own event and ticket. Day-based Discover and per-showing fit are unchanged. An "Also showing" line in the opened ticket is being explored, linked only through a production's own source page. | A full EventSeries table needs a database change and touches Discover, My Schedule and groups. Integration, security and CI come first. Showings must never be grouped by shared title, venue or a general calendar link. |
| Count fitting showings separately from production cards | Nov 9 | Not needed while each showing is its own card. | Comes with the production card above. |
| Keep a cancelled or rescheduled showing so saved plans can say "Cancelled" | Nov 9 | The SCU import skips cancelled rows. A saved plan then shows the missing-event message from R4. | Needs a status column on events (database change). |
| Events with no published end time, with a "Time TBA" review queue | Nov 9, Nov 24 | End time stays required (Nov 24 decision). Incomplete official events are left out. | Needs a review queue and a separate result type that never counts as a fit. |
| My Schedule treatments for plans with no known end | Nov 24 | Not built. | Waits on the row above. |
| Hosts pick a building and room when posting | Nov 24 | Location is free text. | Needs the place registry. |
| Student photos go to the host first, and only the host's picks are public | Nov 23 | The postcard step is a preview and sends nothing. | Needs storage, moderation and host review. |
| Stay inside SideQuest instead of linking out | Nov 24 | My day and Walk there open SideQuest screens. The opened ticket still offers the official SCU map and a Google Maps search. | No verified SCU walking graph is loaded yet. |

**Excluded on purpose:** partial attendance beyond the drop-in rule, travel time deciding a fit, cost, and registration enforcement.

## Supporting documents

See the [technical specifications](SPECIFICATIONS.md), the [README](README.md) and the [final architecture review](docs/FABLE_WHOLE_PRODUCT_ARCHITECTURE_REVIEW_2026-11-09.md).
