# SideQuest: requirements-first, architecture-blind design packet

**9 November 2026 · Input for a NEW Claude Fable 5.2 session, phase A only**

**Purpose:** Give Fable the complete user problem, ambitions, UX choices, uncertainties and course expectations **without showing any existing CRC diagram, ER schema, code architecture, PR #33, or earlier model-generated solution**. Ask it to design independently first. Only after saving its independent analysis should it read [the full comparative investigation](FABLE_WHOLE_PRODUCT_ARCHITECTURE_REVIEW_2026-11-09.md), inspect source/diagrams/PRs and revise its proposal.

**Why this packet exists:** In the previous run, Fable had seen old diagram labels before the independent-design instruction, and it could not access the authenticated Claude artifact, Google Docs, full research images or lectures. It disclosed these limits correctly. This document is a **human- and source-derived synthesis** of earlier discussions and accessible material, not a substitute for inspecting all visuals or authentic course documents. Content below deliberately contains **no recommendation about what classes, SQL tables, adapters, architecture style or libraries to use**. Fable must decide those.

**Phase A permitted visual evidence:** You MAY inspect every actual UI storyboard, mockup and photo-stamp image under `docs/design/exploration-2026-11/` and `docs/design/photo-stamps/`, and any separately supplied source/export/screenshots of the private 264-option Claude artifact. These are product/interaction inputs, not architecture diagrams. Distinguish images you truly viewed from images known only by title. **Do not open other source code, UML/CRC/ER diagrams, migrations, PRs, architecture notes or the old playbook during phase A.** The first pass is analytical only, with no edits, commands, secrets or network mutations.

## 1. Who the product helps and what student interviews actually suggested

SideQuest began as a student product for Santa Clara University students whose spare time, friends' uncertain commitments and interesting local options rarely line up neatly. The initial two interview transcripts are qualitative input from **two people**, not numerical proof of demand.

**Opportunity-first student:** Often has 2–3 companions but not always the same group. Would like a bounded activity during a short available window and sometimes goes alone. Finds places through Google/AI and social apps; plans through informal messages. Likes nearby food, boba, bowling, exercise, spontaneous outings; forgotten activities and drawn-out decisions are problems. Transportation and opening hours can ruin an idea. Longer trips need advance planning. The product must be useful before creating an account or filling out a full calendar, if possible.

**People-first student:** Values time spent together even if the original activity changes. The hard part is finding when friends are genuinely available, sometimes a week or two in advance. Many commitments never reach calendars. Transportation and distance matter unequally for different friends. One big planned trip fell through during a busy academic period; switching to an easier nearby dinner can preserve the relationship goal. She does not want to strand the one person whose constraints others overlook. Forgotten ideas can survive in social messages without becoming plans.

**Three ways to begin planning:**
A. "I have 90 minutes; what is actually possible?"
B. "I want to spend time with these friends; what can we all do?"
C. "We always wanted to do this; when could it work?"

**Research-based principles, still subject to usability validation:** Lightweight entry, explicit unknowns, truthful sources, respect for privacy and human consent, few high-quality options, real constraints before preferences, and a graceful route from a failed plan to another option or a remembered intention.

## 2. Full ambition inventory (requirements and exploratory concepts)

Preserve this inventory in the eventual long-range design, even where December implementation is necessarily smaller. A design can support extensibility without promising every future interface.

### Discovery, activities and source credibility
- Browse official SCU-organized events, independent student posts, clubs, workshops, sports, performances, film screenings, concerts, advising sessions and community activities; show the distinction between validated organizer/source and self-reported details.
- Discover informal things without a predetermined calendar event: a restaurant, boba, bowling, museum, hike, climbing or shopping; optional personalized interest, low-energy, weather, travel, cost, group-size, registration and accessibility restrictions.
- Explore from a free-time window, interests, a named destination, or a desire to spend time with friends. Give a reasoned shortlist with known constraints and uncertainties, not invented precision.
- A continuing activity or theatre production may contain multiple selectable scheduled sessions, including multiple on the same date, and different dates or venues. A performance's reception is potentially a **separate** event. A one-off concert needs one session without awkward fake grouping.
- Individual session status can change: rescheduled, cancelled, sold out, moved venue, changed cast/program, or replaced. Saving a session must preserve identity and enable notification/reconfirmation where authorized.
- When sources duplicate or disagree about details, present verified facts, source provenance, update time and remaining conflicts. Stable external IDs where supplied; review manual imports before publishing. No fabrication of endpoints, official status, lengths or times.
- Importing a list for a demo, synchronizing official sources, and accepting public student submissions have **different reliability/security requirements**.

### Temporal truth, fit and participation
- An event may have a published starting time but **no trustworthy end time**. The system must still let the student discover it; decide how to treat it in exact-fit results, personal planning and visual timelines. A possible **90-minute personal assumption** is one option, not a fact or mandatory default. Compare stricter exclusion, conditional fit and personal estimates.
- Separate actual event start, doors-opening time, expected runtime, venue closing, user-defined attendance interval and flexible/drop-in participation. Unknown data must not silently become zero duration or a confirmed 90 minutes.
- Compare full attendance, possible partial attendance, late arrival, early departure and drop-in rules. A physically overlapping event does not mean a person has committed to both.
- Express time and location honestly: campus/local wall-clock, timezone, same-day versus overnight, DST, source update, cancellations and intervals touching exactly at their boundary. Distinguish committed constraints from tentative assumptions.
- Travel/walking/transit estimates, delays, weather, registration, cost and time buffer can change an otherwise valid time-only fit into a conditional one.
- Students may explicitly mark free/busy, import privacy-preserving Google free/busy, or have neither; **blank calendar = unknown, not free**. "Maybe if I finish at 3" is conditional, silence is unknown, and a calendar event does not automatically prove attendance at a plan.
- Show the reason for a fit/nonfit, and when appropriate let students compare options and alter a proposed free-time window. Avoid fake confidence percentages or universal travel estimates.

### Plans, groups, consent and privacy
- Save an interesting future activity even without choosing a date. Recall something previously wanted, forgotten, postponed or completed; optional memories and "would do again" feedback. Some ideas are solitary, others group-shared.
- A plan combines a proposed time/place/session, organizer, invitees, statuses, preferences and perhaps more than one candidate option. Keep a proposed outing separate conceptually from public source facts.
- Design for both **persistent circles/friendships** and **temporary invitation-based groups**. The second avoids forcing every student to register; the first supports recurring friends. Evaluate whether both must ship or one can be staged without deleting the other from long-range requirements.
- A group may vote or respond "works," "depends/maybe," "can't," or no answer. A tentative "if" condition may have its own deadline. Unknown is distinct from no; a leader selecting an option is not consent by other people.
- Consider soft preferences against hard constraints, personal travel limits, budgeting and accessibility. If a person's private constraint blocks an option, share only authorized feasibility, not the private value or reason.
- A mutual-interest interaction might keep a one-way "I'll go if you go" preference hidden until reciprocated. Assess trust and permission implications; this is a **concept**, not a confirmed launch feature.
- Plans can be pencilled/tentative, inked/committed, postponed, canceled, completed or changed. Clarify who may commit a group, and when invitees must reconfirm after a changed performance or location.
- If plans fail, preserve the user's selected priority: **the same people, the same available time, the desired activity**, or a lower-effort outing. Offer substitutions and a deferred idea without treating a cancelled attempt as disliked.
- A student's private schedule, friend relationship, invitation token, published event and shared plan have different visibility, ownership and deletion rules.

### Posting, ownership, quality and growth
- Let students post events, with form validation before and after submission, legible feedback and accessible controls. The original MVP allowed anonymous posting; later ideas include authenticated organizer rights and edit/delete. Decide whether guest posting survives, where it is rate-limited, and how organizer ownership is proven.
- Long unbroken descriptions, one-letter titles, far-future dates, blocked storage, stale network response, duplicate sources, old saved references, invalid time and malformed fields must not break the experience.
- File uploads and photos may be added later. A postcard/photo stamp with four possible frames, appropriate orientation and alt text is an explored design, requiring storage/privacy/moderation considerations.
- Optional real-time event updates, authorized shared changes, calendar connections, map/travel providers, AI flyer extraction into a reviewable draft, plain-language search, recurring activity discovery and accessible voice assistance. Server secrets must remain server-side.
- The course has nine extra-credit categories with a maximum **five** points total and eligibility/core-functionality conditions. This is ambition, not an instruction to build nine unrelated features at the expense of reliability.

## 3. UI/workflow evidence and visual ambitions

A separate older UI work conversation explored large numbers of screens, including 136 image-based repository storyboards/boards and later an authenticated Claude artifact with **264 selectable design options**. The artifact URL is https://claude.ai/artifact/VG7bovBUCgTHQoZASvRKFp . Earlier tool access exposed only selected screens, **not all 264**. A previous review noted repeated/mismatched navigation IDs and a possible preference for a legible event menu over constantly playful interaction, but do not assume a selected winner. **If the real artifact source cannot be accessed, do not assert you examined the screens.** A source export/screenshots are required for exhaustive visual comparison.

Documented broad UI concepts:
- Current ticket-stub/cream/burgundy/serif identity; discover as vertical trail and possible more dense columns; alternative departures board, date dial, featured event, flyer wall, campus map, event menu and occasional playful selection.
- Differentiated design "rooms" for Discover (paper), My Schedule (night ink), Post (print shop), Someday (jar). Thematic motion must respect reduced-motion preferences and not displace essential information.
- One week's storyboard: optional calendar consent, "fog" for unknown time, a single high-value availability question, Pencil/Pen decisions, simple friend link poll, private travel constraints, plan repair, eventual memory/photo stamp.
- Zero-setup storyboard: offer useful conditional discovery without typing a weekly schedule; progressive learning from user taps with explicit approval and a short optional check-in.
- Four photo-stamp shapes in ticket stub, never covering title, time or action; mobile hero must not hide first event; "bigger cards" is ambiguous feedback requiring user testing. Navigation and selection must remain accessible.

### Core open UI rule: proportionally sized neutral timeline blocks
- In a genuine schedule timeline, a displayed interval's spatial extent **corresponds to its duration**. Given equal scale, 120 minutes takes twice the time-axis extent of 60 minutes. Tiny intervals may need a clearly documented minimum hit target, without falsifying time geometry.
- When intervals overlap, show **side-by-side lanes** or an equivalent legible arrangement rather than hiding one. A visual overlap is a **neutral fact**. Only an independently confirmed scheduling/commitment violation should receive a warning, and a warning does not prohibit exploring alternatives.
- Handle same start, contained event, partial overlap, touching intervals, 3+ simultaneous, phone viewport and keyboard/screen-reader order. Long gaps may be compressed only with visible discontinuity.
- **An unknown end means unknown physical duration**: evaluate an open-ended block, a neutral start marker, a visibly provisional outline or user-selected estimate. Decide what to draw and how to separate it from actual event truth. Show the source of any estimate.
- Consider two distinct views: public time alternatives that may overlap arbitrarily, and a personal committed-plan timeline where confirmed exclusivity may matter.
- This timeline design must not be conflated with fixed-height Discover results or ordinary event-detail cards.

### Peer feedback from 4 November, with known decisions versus open changes
- Long text wrecked some layouts and picked/unpicked ticket states were too similar. Changes were made to truncate list display and preserve full detail, distinguish selected ticket, stop selected hover motion.
- After adding an event, users wanted optional "See My Schedule" shortcut; a toast link was developed, without forcing redirect.
- A year-9999 test post motivated date-horizon validation, now an open implementation effort. On-blur field errors with correction feedback remain an idea.
- Real sourced SCU events improve demo credibility; unsafe arbitrary test posts should be removed after appropriate owner approval.
- A timeline with proportionate card height and neutral side-by-side overlaps was proposed; this user has explicitly reiterated it.
- A user wants edit/delete of own posts, but earlier private-code approach should be evaluated against eventual identity/auth, not treated as a permanent requirement.
- Images as stamps, accessible phone detail, and increasing visible event density were explored. A horizontal-only Discover feed was rejected for basic browsing.
- "Bigger cards" needs evaluation: text size, hit target, event number on screen, or timestamp prominence?
- Separately, Devonny's phone screenshot review led to a smaller hero; browse-details handling should remain distinct from creating a duplicate UI.

## 4. Product scenarios Fable must walk through before designing anything

**A: One-day spare window.** A student has a known 2:00–4:00 PM gap, no account, uncertain transportation, and a mix of 20-minute/90-minute/4-hour opportunities. Some are officially sourced, others are student posts. The student asks why items fit, nearly fit or need verification.

**B: Seven theatre performances.** A production has seven distinct performances across several dates; another production has two showtimes on the same date, plus a separate associated reception. A user views a single production card, selects Friday 8 PM and saves exactly that session. One source changes the time, another is outdated. Existing saved references must not be misidentified.

**C: Unknown end.** One concert starts at 8 PM with no published duration. Someone is free until 9:30 PM. Determine conditional status, source truth, optional planning estimate, how the timeline renders it and whether "fits" may be presented as certain.

**D: Simultaneous alternatives.** Two workshops overlap from 3:00–4:00 and 3:30–5:00; a third runs 3:30–4:00. Show all in the public timeline and the personal tentative schedule. Decide what constitutes a real commitment conflict versus a neutral overlap. Accessibility and small-screen width matter.

**E: Friends who are uncertain.** Three friends include one "works," one "probably after 3" and one who hasn't answered. A fourth friend can join by link without a permanent account if approved. Decide whose data/identity/consent is required and who can see conditions.

**F: Plan change.** The organizer changes event date, an invite expires, and a plan becomes impractical because one friend cannot get there. Preserve the original desired activity, ask for reconfirmation, offer lower-effort alternatives and keep privacy intact.

**G: Someday without a calendar event.** Someone stores "try rock climbing" and weeks later sees a suitable opportunity. Do not create a fake public scheduled event for that intention. Decide how much can be demonstrated this term versus held for later.

**H: End-to-end reliability.** Two independent browsers load catalog and schedule, one posts/edits within authorized permissions, a slow catalog response returns after a newer one, browser storage is disabled, offline writes fail, and one test uses a stale year-2099 fixture. No false success, untrusted source badge or lost plan.

## 5. Course/product constraints to respect

- **M2 Part 2** individual reflection due **Wednesday Nov 11, beginning of class**: truthful Oct 30 and Nov 9 feedback, exact individual and teammate contributions, team strategy, diagram changes with rationale, next features, division of work, precise milestones.
- The final project must include **reworked full CRC / alternative architecture** and **ER** diagrams prepared in **draw.io** and present in the final GitHub repo. Design the full final scope rather than force new features into outdated MVP drawings.
- Lecture 17: Final grading may give little or no partial credit for an unmet requirement. **Every team member must make meaningful coding contributions**; schedules, ownership, feedback and rehearsals need precise examples. Preserve explicit and repeated early presentation preparation.
- Lecture 18: Distinguish development unit/component/system, white-box regression, integrated release black-box/E2E and nonfunctional tests, plus realistic unguided user testing. When a bug is found, store the failing input and expected result, first demonstrate test failure, then fix and verify. Test security and reliability failures, not only happy paths.
- **Final presentation** slide deck due **Wednesday Dec 2 beginning of class**; Group 3 is scheduled Dec 2 if still classified as that group. Group talk 7–10 minutes includes problem/users, elevator pitch, 3–6 minute demo of **actual completed features**, usability conclusions, followed by ~7-minute Q&A with individual calls and concise answers. Rehearse throughout development. Notes about other groups due Dec 4.
- The full separately advertised **Final Project Report** instructions are not presently available in the accessible source notes: obtain from Camino, do not invent rubric/requirements.
- The professor's specific AI coding advice is **excluded at the owner's request**; do not reproduce or rely on it. All other relevant design, reliability, ethics, security, collaboration, accessibility and testing expectations still apply.


## ADDENDUM 9 NOV: diagram correctness, competitiveness and ambition (read before designing)

The previous agent output was **not accepted**. It returned a crowded Mermaid crow's-foot database-schema diagram as the coursework ER, with unreadable/clipped node text. That fails the user's requested output. This is a critical correction to the deliverable, not an invitation to prejudge the domain architecture.

**Course-format constraints for YOUR independent diagram:** The professor's Lecture 17 page 13 and the team's P5 example use **Chen-style conceptual ER notation**: rectangular entities, oval attributes (underline primary/identifying attributes), diamond relationships with meaningful verbs, labelled participation/cardinality and legible connectors. Use **draw.io** as the final editable source, as required by M2 Part 2. An accompanying SQL/crow's-foot physical database diagram may help engineers, but it does **not** replace the graded Chen-style full ER diagram. Carefully represent many-to-many and associative entities, optional versus mandatory participation, and avoid wrongly treating transient computation/presentation data as persistent entities. A CRC or equivalent full architecture drawing is a **separate deliverable** and must show actual responsibilities and collaborators.

**Visual quality is an acceptance test:** Before presenting any diagram as ready, export/render it at its intended viewing scale and inspect every node, attribute, connector and cardinality for clipping, collisions, overlapping text, illegible labels, or unreadably dense groupings. Enlarge nodes to fit their labels, use adequate spacing and high-contrast 12–14 pt or larger equivalent text at intended print scale. Use multiple logically linked draw.io pages/sections and a readable overview instead of cramming 20+ entities into one picture; the complete full model must remain understandable. Give the user render previews and editable files when writing is authorized. A Mermaid source or a diagram that merely parses is not an accepted visual deliverable. Do not claim rendering was checked unless it actually was.

**Competitive ambition is a requirement, not decorative scope:** The user wants a distinctive, competitive SideQuest, and rejects a final implementation that reduces the product to a campus event list or a generic invite/RSVP/poll website. Most invite links, RSVP, event posts, polls and recurring events are already represented by products such as Partiful, Luma, When2meet, Google Calendar, Meetup and others; establish up-to-date competitor facts and compare *combinations of user jobs*, not just checklist features. The promising product identity combines (1) discover *starting from available time*, including honest unknowns and why-fit explanation; (2) coordinate group intent and uncertain real availability with privacy and human confirmation; (3) remember unfinished activity ideas and repair plans when circumstances change; (4) present trustworthy, instance-level local opportunities. Fable must challenge and strengthen this thesis with evidence and recommend at least two coherent **noncommodity end-to-end user journeys** for the graded build. Do not label an invitation or a user-account screen as a differentiator by itself.

**Ambition and delivery planning:** Design the full app's long-range capabilities first, and then make a credible **integrated, ambitious December cutline**, with real priorities and acceptance tests. Do not habitually defer *all* distinguishing behaviors while implementing generic infrastructure. If social coordination is the strongest competitive wedge, it should appear in a working demo; if the highest-value low-dependency wedge is Someday + feasible reappearance, say so and build that. Quantify dependency risks and propose *scope reductions within features* (e.g., manual sources before automatic sync), rather than excluding all signature features. Keep the professor's near-binary grading, four contributors, Thanksgiving and the 7–10-minute demo in view. Rehearsals begin during development.

**Product medium:** SideQuest today is a responsive **browser-based web application** (React/TypeScript frontend plus Node/API/database), reached through a website URL. It is an **app and a website** in common conversation: an interactive web app. The current implementation does not establish a native iOS/Android app; an installable PWA or native wrapper would be an optional, separately justified distribution project. Decide based on user needs and course deadline rather than blurring platform terms.

**Model and source accountability:** If the tool claims to run Fable 5.2, verify actual provider and request model identifier in the model selector/API log when available. A text report by itself cannot prove which model ran. For missing original class or UI source, explicitly mark the uncertainty; do not substitute made-up screenshots or claim all 264 screens were examined. Preserve independent design by reading *requirements and actual UI images* before any existing architecture or code.


## 6. Phase A output contract: choose independently

**Without opening any existing class diagrams, ER drawings, code files, team architecture plans or PRs**, do the following:

1. Write a faithful inventory of user jobs, current-time requirements and long-range product ambitions. Make a distinction between essential interactions and speculative embellishments; explain uncertainties in the evidence.
2. Define the domain boundaries and relationships **from scratch**. Choose which concepts deserve first-class identities, what is persistent, what is merely derived, what is private and what is public. Consider event programs, actual sessions, unscheduled activities, intentions, plans, invitations, people, claims, preferences, sources, fit and visual timeline. Do not assume every noun becomes a database table or class.
3. Produce **your own** conceptual CRC/responsibility/collaboration or equivalent architecture diagram, complete ER proposal with keys/constraints/permissions, and a primary interaction sequence. Explain any decision to reuse a class-based MVC or adopt another structure only once phase B reveals the implementation.
4. Make hard recommendations for unknown end, overlap/geometry semantics, groups with and without permanent membership, identity and guest use, external data reconciliation and plan lifecycle. Use worked scenarios and tradeoffs.
5. Propose two staged delivery shapes: a credible graded December 2 demo and the full ambition preserved as future extensions. Evaluate dependency risk and teammate workload, not only number of features. Avoid treating one person's visual work as the entire project.
6. **Save the independent design and its unresolved questions before reading existing architecture**. No runtime edits; in Plan mode, produce the output in the conversation for approval or save later on a dedicated docs branch when authorized.

Once phase A is complete, the owner will supply the comparative brief. **Phase B:** read [FABLE_WHOLE_PRODUCT_ARCHITECTURE_REVIEW_2026-11-09.md](FABLE_WHOLE_PRODUCT_ARCHITECTURE_REVIEW_2026-11-09.md), actual sources, PRs and code; compare, criticize, synthesize, verify and produce **editable draw.io** as well as file-by-file conformance evidence.
