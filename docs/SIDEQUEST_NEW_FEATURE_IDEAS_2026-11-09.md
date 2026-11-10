# SideQuest: New Feature Ideas, November 5–9, 2026

**Source:** User-provided document titled "SideQuest New Feature Ideas.md," dated November 9, 2026. This is a faithful **feature and interaction inventory** adapted from that document for direct reading in Cline/Fable. It is **not a team-approved specification or evidence of implementation**. The source says its screens live on a separate review page with Keep / Maybe / Toss annotations; the actual screens and source data require independent visual and technical verification. For prior explorations, read [the deep-research roadmap](DEEP_RESEARCH_PRODUCT_STRATEGY_2026.md) and [the requirements-first briefing](FABLE_REQUIREMENTS_FIRST_INDEPENDENT_DESIGN_2026-11-09.md).

The older roadmap focuses on the November 5 calendar-gap work, the two storyboards, voice concepts and rounds 2–3. This document captures later photo/media thinking and **option rounds 4, 5, 6 and 11**. None should silently change the M2 implementation contract in REQUIREMENTS.md or SPECIFICATIONS.md.

## 1. Live SCU event data and images

**Candidate SCU source:** LiveWhale JSON, illustrated in the source note by https://events.scu.edu/live/json/events/max/5/response_fields/image,location,group_title,thumbnail . This link is an example with a **five-item limit**, not proof of a complete production-ready feed. Validate terms/permission, coverage, recurrence expansion, stable identity, source updates, cancellation, pagination, freshness, rate limits and accepted images before adopting. The user-authored note says to ask Campus Life or the feed owner before shipping an import. The proposed companion photo pipeline is at https://claude.ai/artifact/8DMDHUz1sKgNUTPhhwhdWP, but access has **not been confirmed**.

| Proposed feature | Behavior from the source note | Review screens |
|---|---|---|
| SCU Events import | Automatically ingest title, time, place, hosting group, media and cancellation state; update/caution saved plans when a source cancels | PF1, PK9 |
| Host photo upload | In Post step 2, optional own photo becomes event-card stamp; host adjusts photo within frame; fallback category drawing | PK7 |
| One focal point for formats | Single host-specified focus point adapts the image to 4:3 card, 16:9 detail hero, square row; ask for alt text | PF4, PK8 |
| Paste a page link | Propose parsing an event's Open Graph/link-preview media and fields with "via" attribution; Instagram media may require manual host upload | PF6, PK10 |
| Flyers versus logos | Full flyers preserve words; a flyer may have its date/time highlighted; logos become a host pin instead of a distorted crop | PF11, PK11 |
| Consent and initial check | Ask whether the host took the photo and whether depicted people consented; strip location metadata; allow event to publish with drawing while first photo awaits review | PF5 |
| Photo reports | Four report reasons; reporter immediately hides offending photo on their own screen, without removing event | PF7, PK12 |
| Moderation queue | Staff can approve/remove waiting or reported photos; removal deletes file and provides the host a reason | PF8, PK13 |
| Attendee contributions | Small image row of photos from people who attended, if galleries are later approved | PF2, PF12 |
| Sunday recap | Personal photo scrapbook of attended activities, with associated time spent | PF10, PK14 |

**Important product and engineering review issues:** A two-question self-attestation is not proof of valid image rights or the consent of every depicted person. Source photos, host uploads, flyers, logos, generated art and attendee photos have distinct permissions, licenses and moderation responsibility. Decide retention, takedown, proof or audit policy, abuse reporting, image limits, safe image processing, authorization, file deletion semantics, EXIF/location stripping, alt-text quality, cropping and accessibility; neither participant identity nor attendance should be inferred from someone appearing in a photograph. Image reports do not automatically justify deleting the whole event.

The source note says **one out of five** inspected feed results on November 7 showed a real photo, while others were a logo, two flyers and an icon. This is a five-item observation, not an empirical distribution of all SCU events. Test broader samples.

> **Later user refinement (November 9–10): Prefer reusable category artwork, not per-event automatic illustration generation.** The four-layer motif-compositing pipeline below is preserved as a **historical brainstorming proposal**, not the recommended final-project feature. The user questioned its cost and workload, and proposed a few broad, illustrated activity types that each visually contain several related activities. Recommended working direction: prepare **six or seven curated category collages**, reuse them as Discover category filters and as neutral image fallbacks for events without authorized photos, and keep an optional "Other" typographic fallback. Example broad types are Arts & Culture, Music & Live, Food & Social, Sports & Outdoors, Learning & Making, Campus & Community, and optionally Wellness & Relaxation. These are candidate labels, not approved taxonomy. Map imported events via simple reviewed rules and host posts via an editable category selector; allow a small set of optional secondary tags. Do not build AI motif generation, server image assembly, caching or forty-to-sixty unique motifs for the December release. Verify with the team whether six/seven categories are appropriate for actual event distribution. Distinguish category filters from parent event-series/occurrence grouping: a production's category is not a substitute for showtime identity. Photography, rights and moderation remain separate future decisions. Preserve the earlier technical proposal below for possible future exploration, rather than treating it as committed scope.

## 2. Assemble consistent event illustrations from curated parts

The proposal avoids requiring a hand-drawn illustration for every imported event. Instead, the server assembles a distinctive picture *once* at import time and caches it. The user would still be able to swap the graphic.

**Layer model:**
1. **Place:** location-specific artwork of Mission, Benson, Learning Commons, Ricard, rose garden, Locatelli and fields; these largely stay stable across events.
2. **Activity:** ~40–60 small motifs such as microphone, mug, bowl, racket, brush, laptop, film reel, guitar, pizza, book, ball and lantern.
3. **Frame and color:** one of six shapes, one or two chosen colors and print texture; use deterministic event-ID-based variation so two pizza nights need not look identical, while the same event image remains stable.
4. **Date as graphic:** when nothing more meaningful matches, the start clock/day abbreviation becomes a typographic illustration, such as 8:00 or FRI.

Use a keyword mapping over title, description, host and location first; a *small optional model call* can map difficult inputs only to already curated motifs. The proposal deliberately **sets aside unrestricted AI image generation as the default**, due to visual inconsistency, ongoing cost and unreviewed output risk. Keep Mission church/fountain and wisteria as hand-drawn brand artwork. Image selection priority proposed:

1. Host's own photo;
2. Photo from source page;
3. Flyer shown intact;
4. Logo as a separate pin;
5. Server-assembled illustration;
6. Typographic date stamp.

**Architecture decisions:** What counts as a usable and legally permitted source photo? Does a missing host photo fall through to an official source, or might a questionable uploaded image override trusted art? Are image selection and validity separate? Can different performances share production artwork while retaining distinct time stamps? Event ID alone is stable under rescheduling but generated images may need versioned cache invalidation; do not assume deterministic means immutable forever. Do not recreate flyer text by hallucinated OCR; ensure legible full-flyer display. The word "palette" in the source document is a UI/art specification, not a generated-picture instruction.

## 3. Discover explorations from rounds 4–11

**Four experiences marked KEEP in the source review:** shape filters, free-hours board, claw-machine discovery, and "Still on?". The source says "Still on?" (W12) was already documented on master; round 11 adds the plan's photo to the notification. These are design marks, not team or feature approvals. Round 11 reworked six marked designs with real photos; verify each rendered screen and ID on the owner's review page, particularly because earlier artifact navigation IDs were mismatched.

| Concept | User interaction | Mark / screen IDs |
|---|---|---|
| Shape filters | Large photo-cut shapes with event counts; tap interesting shapes, then filter to what fits | Keep: G6, PK1 |
| Your free hours, matched | Available-time blocks on one side, qualifying events on the other, lines show matches; friend's name may appear on shared path | Keep: L1, PK2 |
| Grab a plan | Claw machine with event capsules/characters; randomly or interactively select an event that fits the week | Keep: L2, PK3 |
| Free-time lens | Move a lens across an evening; adjust start and duration; display what fits under it | Maybe: A7, PK4 |
| See where you overlap | One card per friend shows *shared free time only*, not the friend's detailed private schedule | Maybe: A8, PK5 |
| Turn the dial | Clock/ring of start times populated by starting events | L9 |
| How social tonight? | 1–5-level slider and hourly opportunity chart | L6 |
| Feeling first | Mood selection (cozy, curious, restless) precedes fit-ranked suggestions | A10 |
| Starts soonest | Countdown to the next nearby activity | L7 |
| How busy it gets | Event crowd curve with the user's available interval overlaid | G3 |
| Plan sheet | Start time, invited companions, reminder and suggested spots in one configurable sheet | L4 |
| Tonight by the numbers | Counts of events tonight, those fitting you, and possible shared options | L8 |
| Still on? | Check/confirm plan shortly before it happens; enrich prompt with relevant plan photo | Keep: W12, PK6 |

**Critical visual semantics:** The note says the free-hours board uses **red lines to indicate a match**. Elsewhere the user explicitly requires **neutral event overlaps** in proportionally timed schedule blocks and has challenged red conflict warnings. Treat the free-hours matching-line color as a **visual proposal**, not a business rule or a color-only status convention. Distinguish matched opportunity links, neutral time overlaps, actual confirmed scheduling conflicts and incomplete/estimated fits using labels/shapes as well as color. Displaying a friend's name on a link or showing common free time can reveal participation; get consent and obey plan-level permission. Claw selection must honor feasible confirmed/possible distinctions, safety/accessibility and a non-gimmicky alternative. Crowd curves and “tonight” counts need actual data provenance.

## 4. My Schedule, Post, Someday and cross-device proposals

The source says ideas from rounds **4–6** in this table **have not been marked Keep/Maybe/Toss**, and several overlap. This is a choice set, not an agreement to implement every proposal.

| Surface | Candidate | Interaction | Screen IDs |
|---|---|---|---|
| My Schedule | Leave-by card | Next plan with departure time, walk, distance, sunset | B4 |
| My Schedule | One line for the day | Vertical time sequence with inter-plan walks; mark plan done | N3 |
| My Schedule | Streaks and weekly checks | Daily completion check, weeks containing one side quest | B2, N1 |
| My Schedule | How it felt | Optional mood after a plan; month-by-feeling view | B7 |
| My Schedule | Club stamps and levels | Club-specific stamps and Newcomer / Regular / Local levels, possible earlier invitations | N5, N6 |
| My Schedule | Quarter in numbers | Went, planned, passed, hours free, frequent companions | N4, N8 |
| My Schedule | Ambient clock | Calm desktop countdown to next plan | B9 |
| Post | Flyer-to-reviewed-draft | Paste flyer; parsed values fill fields, gold dashes mark uncertainty | R3 |
| Post | Doodle a flyer | Sketch casual poster; AI generates an organizer-reviewed poster draft | C6 |
| Post | More post options | Duration, who can see it, what to bring, number of places, waitlist | R4 |
| Post | When students are free | Organizer sees aggregated counts by proposed start time, not personal calendars | I3 |
| Post | Club dashboard | Viewed, fit, planned, attended, newcomer counts | I4, R5 |
| Post | Countdown story | Shareable changing three-day countdown in three sizes | C9 |
| Someday | Gumball machine | Draw a saved idea that fits this week | E5 |
| Someday | Menu of readiness | Ideas show prerequisites and readiness; pill counts ready ideas | R6, R7 |
| Someday | Crew Someday | Shared list of aspirations for a friends group | I6 |
| Everywhere | Home/lock widgets | Next plan, walk time, streak, newly fitting options | E4, I7, R8 |
| Everywhere | Browser invitation page | Publicly openable by link, displaying plan, countdown, attendance count and one "I'm in" action | I9, R9 |
| Everywhere | Empty states | Recognizable calm character and useful next action | E9 |

**Privacy and implementation cautions:** A web app does not automatically have native iOS lock-screen widgets. Separate an installable PWA/home-screen shortcut from native OS widget integrations; do not promise device capability before testing. Club dashboards about who planned/attended require real opt-in evidence and appropriate aggregation; viewing or saving an event is not proof of attendance. A "when students are free" chart is sensitive if cohorts are small, so enforce opt-in sampling, reasonable minimum group sizes and no precise private calendar visibility. Club stamps and streaks should remain optional; they should not manufacture attendance or pressure participation. Photo and post editing require user ownership and accessible fallbacks.

## 5. Prior roadmap ideas listed again in the user source (avoid double-counting)

The November 9 source repeats concepts already in the 5 November roadmap. Review them in the original full context rather than counting them as new decisions:

- Unknown calendar time displayed as "not sure yet"/fog; Google shares free/busy only, never titles. Ask one focused question when it changes a recommendation; one-click "Bad time" feedback; optional ten-second Sunday check-in; bulk class import.
- Pencil/tentative versus pen/confirmed plans; "Still on?" two days before; repair preserving up to two priorities; leave-by reminder and running-late action.
- Friends respond Works, If…, Can't through a guest browser link; ranking considers worst-off friend, private personal travel limits, persistent circles versus pop-up groups, conditional "I'll go if you go"/"Down, if…".
- Someday ideas mature when preconditions occur; passport-like stamps for ordinary experiences.
- User-reviewed flyer extraction; natural-language search.
- Optional push-to-talk voice behind a speech port; retain times but not detailed private reasons.
- Design option rounds 2–3: Discover D1–D9/F1–F9; Schedule S1–S9/M1–M9; Post P1–P8/K1–K9; Someday J1–J9/Y1–Y9; Voice V1–V8; tab bar T1–T8.

## 6. Explicit unresolved questions copied from the source, with review implications

- Is the SCU Events/LiveWhale feed licensed/authorized for the intended import and media usage? **Validate with the feed owner before shipping.**
- The source claims Supabase hosted image resizing requires a paid tier and provides pricing figures. Treat those as **dated and unverified**; check current provider documentation and costs. On a constrained budget, consider resizing safely at upload/ingestion with correct media handling.
- Who moderates first-time photo uploads and reports, with what response time, appeal process and logging? Who has deletion authority?
- Does SideQuest support **one image per event**, production-level shared media, or event-specific galleries from actual attendees? Who may contribute, and how is attendance verified or not inferred?
- Generate illustrations with deterministic keyword mapping only, or optional restricted model classification? How much artwork is needed (40–60 motifs and campus locations), who owns it, and can it be finished before December?
- Which Discover screen becomes the primary: photo-shaped filters, available-hours board, or claw? They can coexist as different levels of interaction, but should not all dominate the primary flow.
- The L5 design says **"fits 92%"**. Do not display a percentage unless it can be backed by an explicit validated model and shown with an honest definition and uncertainty.

## 7. Task for Fable: inspect new evidence without mistaking concepts for shipped features

This is a **source-driven extension** to the requirements inventory. The earlier [Phase A packet](FABLE_REQUIREMENTS_FIRST_INDEPENDENT_DESIGN_2026-11-09.md) remains the requirements-first starting point; this file adds later, specific design concepts and unresolved media/event-ingestion questions. Before proposing a final architecture:

1. Record which new ideas genuinely change the domain (media assets, permission/access scopes, source records, revisions/cancellations, attendee photos, RSVP evidence, plan reminders, activity intentions) and which are presentations of existing concepts.
2. In Phase A, inspect actual prototype images/screens when accessible before choosing a UI. Preserve **free-time-first search and browse-all** as separate modes of one Discover surface. Evaluate the Keep/Maybe/Toss options as design preferences, not approvals.
3. Evaluate two end-to-end differentiated journeys with media and honest time feasibility, and compare their likely delivery impact on the existing team.
4. In Phase B, check the actual event API/SQL/storage interfaces and any later PRs for compatibility. Draw both conceptual Chen-style ER and optional crow's-foot SQL model if they add distinct value; do not make a table for every screen.
5. Require factual verification of current feed licensing and image rights/costs before allowing source content or host images onto a live site. Do not let a photo pipeline become an open moderation/security hole.
6. Preserve the rest of the full ambition. Choose a clear final-course implementation cutline based on coherent user outcomes instead of excluding all differentiating features or implementing every sketch.
7. Note explicitly when the original source images, source page, Claude photo artifact or 264-option UI artifact were inaccessible. Do not claim to have inspected them from their file names.

No changes to runtime code, database, production imports, authentication, images or team scopes are authorized by publishing this research note.
