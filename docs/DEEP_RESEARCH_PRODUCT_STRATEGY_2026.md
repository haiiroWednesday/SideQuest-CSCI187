# SideQuest Deep Research: the unmet job, competitors, research literature, and a buildable roadmap

**27 October 2026 · Research memo, not an MVP scope change.** Sources: the group's original P0, P1 [interviews](https://docs.google.com/document/d/1NRX14JTG78lvDj_AUFRzaricBm-QR4vECJiLfvXGu1M/edit), [P1 analysis](https://docs.google.com/document/d/13OOI6XF8nOiJcPj4t3Jdfxqid2EOuCfh78p7x7cYOGE/edit), [P3 requirements](https://docs.google.com/document/d/11Yq8sW1aOphznZHP-zbul2OedCbLJtxczb-ZZDD3oR8/edit), [P4 architecture](https://drive.google.com/file/d/1xiZGXQeScuJx14yKNUcwj1XtWTfOb-l4/view), [verified extra-credit rubric](https://docs.google.com/document/d/12slKo80yu17NZw5nbrB0U1C_nj7mLq6h6uQoSbkCVQk/edit?usp=sharing), current software competitors, and peer-reviewed HCI/recommender research. Each claim should remain distinguishable as observation, external research, or team hypothesis.

> **This is the fully illustrated research document.** It consolidates the original interviews, competitor review, HCI literature, product hypotheses, the extra-credit rubric, implementation guardrails, and **editable Mermaid source diagrams**. The [MVP implementation contract](MVP_TEAM_PLAYBOOK.md#shared-event-data-contract) remains authoritative for what the four agents should code **now**; future flowcharts do not authorize M2 scope changes.

**P5 coursework context (28 October):** the [selected P5 ER drawing](https://drive.google.com/file/d/1gzbESV0y6hdACNoPJeH3hnO1zxFQ54Lv/view) contains USER, EVENT and AVAILABILITY_WINDOW and is explained [directly in the MVP Playbook](MVP_TEAM_PLAYBOOK.md#p5-coursework-er-diagram--current-drawio-and-mermaid). That **coursework diagram is separate from the smaller M2 implementation**; user accounts, saved availability and cost fields are not shipped merely because they appear in P5.

**Jump to:** [research atlas](#visual-research-atlas-and-full-design-implications) · [raw interviews](#original-interview-evidence-two-people-not-representative-statistics) · [competition](#a-more-honest-competitor-landscape) · [HCI findings](#the-outside-research-that-deepens-the-design) · [prototype](#a-product-design-worth-prototyping-hypotheses-not-shipped-features) · [future-proof architecture](#architecture-extensions-without-trashing-m2) · [extra credit](#extra-credit-evidence-based-plan-actual-rubric-maximum-5) · [usability studies](#concrete-validation-experiments)



## Executive finding

The agreed MVP (post a campus event → browse → find full fit → plan on this device) is a legitimate first vertical slice, but the **actual interviews discuss informal outings and places much more than formal campus events**. The eventual product's main job should be *turning a real opportunity or unfinished desire into a workable outing with the right people, then repairing a plan when circumstances change*. Do not describe SideQuest as another Meetup/Luma/SCU calendar clone.

**Research hypothesis:** SideQuest might add value in the *transition* between (a) free time or social desire, (b) feasible options, (c) tentative group commitment, and (d) adaptation. Group polls, synced calendars and event discovery alone are already served by other products.

## Visual research atlas and full design implications

The graphics here are **Mermaid diagrams stored as source code in this Markdown document**. They are not screenshots, nor changes to the P4 draw.io submission. All future-product features are **hypotheses or proposed interfaces**, not code currently running in M2.

### Figure A — The four different objects we must not collapse into Event

A scheduled university workshop is not the same sort of object as a recurring opportunity to go bowling, an unfulfilled desire to try bowling, or a confirmed weekend bowling plan. The raw interviews contain all four.

```mermaid
flowchart TB
    Event["Event: scheduled occurrence"] 
    Activity["Place or Activity: repeatable possibility"]
    Intention["Intention: something someone wants to do"]
    Plan["Plan: chosen time, option, and participants"]
    Catalog["EventCatalog: public event records"]
    Schedule["M2 Schedule: local event IDs"]
    Catalog --> Event
    Intention -->|"may refer to"| Event
    Intention -->|"may refer to"| Activity
    Plan -->|"may use"| Event
    Plan -->|"may use"| Activity
    Plan -->|"may fulfill"| Intention
    Schedule -->|"M2 references"| Event
```

**Precise semantics:**

| Concept | Example | Does it require a fixed event time? | What changes later? |
| --- | --- | --- | --- |
| `Event` | Photography workshop on Friday 2–4 p.m. | Yes | It may expire, cancel, sell out, or change its details |
| `Place/Activity` | Museum, bowling, boba outing | Not inherently | Opening hours, travel modes, price, availability and duration |
| `Intention` | “I'd like to try rock climbing” | No | Active, deferred, fulfilled, or rejected; remains useful beyond one event |
| `Plan` | “Three friends, rock gym, Saturday 3 p.m.” | Yes, once proposed | Tentative, confirmed, completed, canceled, postponed, repaired |

Do **not** force unscheduled outings into fake public Event rows with invented start times. That creates a brittle catalog and prevents the genuine intention-to-opportunity workflow.

### Figure B — Interview evidence, not a persona-only abstraction

```mermaid
flowchart LR
    I1["Interview 1: forgotten ideas"]
    I2["Interview 1: long group decision"]
    I3["Interview 2: unrecorded commitments"]
    I4["Interview 2: big outing collapses"]
    M["Proposed product mechanisms"]
    Memory["Contextual intention memory"]
    Shortlist["Small feasible shortlist"]
    Uncertain["Tentative and unknown availability"]
    Repair["Preserve people, time, or activity"]
    I1 --> Memory
    I2 --> Shortlist
    I3 --> Uncertain
    I4 --> Repair
    Memory --> M
    Shortlist --> M
    Uncertain --> M
    Repair --> M
```

This maps only what the participants or interviewers' notes substantiate. **It does not establish prevalence or prove that these mechanisms will solve the problem.** Interview 1 has primary and secondary notes; the retrieved Interview 2 secondary-notes heading has no content. Follow-up usability studies should test both interpretations.

### Figure C — Two planning motivations, plus the unfinished-intention entry point

```mermaid
flowchart TB
    W["We have a free window"]
    G["We want to spend time together"]
    I["We have wanted to do this activity"]
    T["Set a real time window"]
    P["Name participants and priorities"]
    R["Retrieve or record the intention"]
    F["Evaluate trustworthy current opportunities"]
    O["Present 2–3 feasible or conditional choices"]
    C["Ask humans to confirm commitments"]
    W --> T --> F
    G --> P --> F
    I --> R --> F
    F --> O --> C
```

The *free-time* path is closest to the current MVP. The *social-occasion* path is rooted in the second interview: an alternative dinner can fulfill the goal even if the original trip never happens. The *intention* path responds to the first interview's reported forgotten places.

### Figure D — Four availability states, not a binary calendar

```mermaid
flowchart LR
    Calendar["Calendar entry"]
    Manual["Participant response"]
    Unknown["No answer yet: UNKNOWN"]
    Yes["Confirmed free: AVAILABLE"]
    Maybe["Probably free: TENTATIVE"]
    No["Cannot attend: UNAVAILABLE"]
    Check["Resolve ambiguity before committing"]
    Calendar --> Check
    Manual --> Check
    Unknown --> Check
    Yes --> Check
    Maybe --> Check
    No --> Check
    Check --> Decision["Feasibility uses only confirmed facts"]
```

**Availability truth table (future group feature):**

| Statement | Stored interpretation | Safe behavior |
| --- | --- | --- |
| “Yes, I can make it” | AVAILABLE, participant-confirmed | Candidate participant; still check destination and cost |
| “I can probably do after 3” | TENTATIVE; earliest time conditional | Keep conditional; ask for confirmation near decision |
| “No, I work until 7” | UNAVAILABLE during the earlier window | Treat as hard exclusion for that time |
| Silence, no shared calendar, or ambiguous message | UNKNOWN | Do **not** infer availability or agreement |
| Calendar appears blank | Evidence insufficient | Ask rather than declaring someone free |

A time poll that reduces `UNKNOWN` to `NO` hides missing information; one that reduces `TENTATIVE` to `YES` can create an unwanted social obligation. These are design inferences from the interviews and related scheduling research, not M2 requirements.

### Figure E — Decision quality: hard constraints, negotiable preferences, and unknowns

```mermaid
flowchart TB
    Candidate["Candidate event or activity"]
    Hard{"Hard constraints satisfied?"}
    Exclude["Not currently workable"]
    Unknown{"Are critical facts unknown?"}
    Conditional["Conditional: ask or verify first"]
    Compare["Compare soft preferences fairly"]
    Short["Offer a small feasible shortlist"]
    Candidate --> Hard
    Hard -->|"No"| Exclude
    Hard -->|"Yes"| Unknown
    Unknown -->|"Yes"| Conditional
    Unknown -->|"No"| Compare
    Compare --> Short
    Conditional --> Verify["Check registration, hours, transport, and people"]
    Verify --> Hard
```

**Research insight:** averaging group preferences can still exclude a travel-constrained participant. Start with constraints everyone must satisfy; compare preferences among viable options; show unknowns explicitly. Never present a numerical “92% feasible” score unless its definition and data provenance can be explained and tested. A group fairness study ([article](https://link.springer.com/article/10.1007/s11257-023-09363-0)) cautions against assuming one aggregation algorithm works for all group types.

### Figure F — Plan repair: preserve the goal rather than erase the plan

```mermaid
flowchart TB
    Failure["Original outing no longer works"]
    Protect{"Which priority should be preserved?"}
    People["Keep people and the existing time"]
    Activity["Keep desired activity"]
    Time["Keep time, reduce effort"]
    Replace["Find alternative activity"]
    Reschedule["Find later workable time"]
    Lower["Find shorter or closer outing"]
    Defer["Save original as deferred intention"]
    Confirm["Ask affected people to confirm"]
    Failure --> Protect
    Protect -->|"People"| People --> Replace --> Confirm
    Protect -->|"Activity"| Activity --> Reschedule --> Confirm
    Protect -->|"Time"| Time --> Lower --> Confirm
    Replace --> Defer
    Lower --> Defer
    Reschedule --> Defer
```

**Interactive screen translated into written behavior:**

| User's choice | What the UI should preserve | What the system should change | What it should not assume |
| --- | --- | --- | --- |
| **Keep the people and time** | Intended attendees and shared window | Location or activity; perhaps choose nearby dinner | That the original trip is now permanently rejected |
| **Keep the activity** | Desired place/activity | Date/time, potentially transportation | That rescheduling makes everyone automatically available |
| **Keep the time, lower effort** | Current window | Duration, distance, cost, commitment | That low effort is identical to low preference or low enjoyment |

The original *Corpus Christi* trip illustrates the potential value of preserving intent after a schedule conflict; the interview does **not** establish that the participant would prefer these exact options. Test choices with users rather than attributing them to the interviewee.

### Figure G — Where AI belongs, and where it doesn't

```mermaid
flowchart TB
    Text["Casual request: probably free after 3"]
    AI["AI extracts provisional constraints"]
    Confirm["Participant confirms or corrects"]
    Rules["Deterministic feasibility evaluator"]
    World["Event, map, transit, and opening-hour facts"]
    Result["Workable / conditional / impossible / unknown"]
    Explanation["Explanations grounded in the actual records"]
    Text --> AI --> Confirm --> Rules
    World --> Rules
    Rules --> Result --> Explanation
    Explanation --> Human["Human accepts or revises plan"]
```

**AI is not authoritative:** an AI API feature should work on *actual SideQuest records* and confirmed constraints; it should not fabricate route times, dates, tickets, people, or commitments. AI use during development via Cline/Claude does **not** count as in-app AI extra credit. Published research on AI plan preference versus success motivates testing objective task completion rather than just perceived cleverness.

### Figure H — Preserve the M2 code boundaries and add new concepts later

```mermaid
flowchart TB
    subgraph M2["M2 MVP: implemented / agreed scope only"]
        View["React feature views"]
        Controller["Feature controllers"]
        CatalogPort["EventCatalogPort"]
        Event["CampusEvent"]
        Time["Pure time matching"]
        Local["Local Schedule event IDs"]
        DB["Shared public events table"]
        View --> Controller
        Controller --> CatalogPort
        Controller --> Time
        Controller --> Local
        CatalogPort --> Event
        CatalogPort --> DB
        Time --> Event
    end
    subgraph Later["Later final product: add deliberately"]
        Place["Place or Activity"]
        Intent["Intention"]
        Plan["Plan and plan status"]
        Group["Scoped group availability"]
        Fit["FitEvaluation and reason codes"]
        Source["External sources with provenance"]
        Repair["Opportunity matching and plan repair"]
        Intent --> Place
        Intent --> Event
        Plan --> Intent
        Plan --> Group
        Repair --> Plan
        Repair --> Fit
        Source --> CatalogPort
        Fit --> Place
        Fit --> Event
    end
    Controller --> Repair
```

The arrow from `Controller` to `Repair` is **future extensibility**, not an M2 implementation task. Keep Supabase behind `EventCatalogPort`, local planned IDs separately, and time checks in pure functions. Do not add unused classes to claim future-proofing.

### Figure I — Research, implementation, and extra-credit evidence loop

```mermaid
flowchart LR
    Evidence["Interview problem"]
    Requirement["Testable user requirement"]
    MVP["Small implemented feature"]
    Test["Automated tests + cross-browser demo"]
    Study["Usability test against existing tools"]
    Reflection["Document decision and limitations"]
    Bonus["Extra-credit demonstration if eligible"]
    Evidence --> Requirement --> MVP --> Test --> Study --> Reflection
    Test --> Bonus
    Reflection --> Bonus
```

This is the standard to apply to each optional feature. Extra-credit points cannot be claimed just because a named technology appears in `package.json` or because an agent generated an attractive demo. Every feature needs a reliable behavior, evidence, and a human explanation.



## Original interview evidence: two people, not representative statistics

**Interview 1** (both interviewers' notes): small rotating 2–3-person outings; frequent Google/AI search followed by Snapchat, Discord, Instagram, calls and messages; group decision takes a long time; sometimes interested places are forgotten until after making plans; common trips 2–3 hours and one destination; difficulty finding places open in the evening; group changes when friends are busy; on failure, switch venue or reschedule. Travel limits depend on outing. Avoid treating one reported number as a global radius.

**Interview 2** (primary interviewer notes; second-note heading blank): making plans is mainly about being with specific friends. Organizer willing to arrange bookings/driving still couldn't coordinate desired Corpus Christi outing because of work/end-of-term obligations. Google Calendar doesn't capture some commitments; advance availability is not fully known. Luma, word-of-mouth, flyers, Instagram and screenshots already source ideas. Registration can close, and transport cost/mode matters. Group occasionally downshifts a large outing into a nearby dinner; the participant doesn't want anyone excluded. A casual “I'm down” is not necessarily confirmed attendance.

**Evidence → hypotheses:**

| Actual finding | Best design hypothesis to test | What not to assume |
| --- | --- | --- |
| Forgotten places and ideas | Store `Intention` separate from a planned `Event`; contextually resurface | Generic push reminders will fix memory |
| Endless suggestion/messages | Show 2–3 decision-ready feasible options with a shareable link | More recommendations means better decisions |
| Social purpose matters | Capture **keep these people**, **keep this time**, **keep this activity**, **minimize effort** as planning intent | Highest-scoring activity equals best outing |
| Missing informal commitments | Allow manual and **tentative** availability, scoped to a plan | A synced calendar establishes truth |
| Plans downshift to local dinner | Repair a plan with **preserved invariants**; defer original intention | Failure should erase the desired experience |
| Luma/flyers/screenshot source fragmentation | Save URL or screenshot of a future place/event with user confirmation | We need to rebuild Luma registration |
| Transport and registration fail | Use source-aware feasibility with UNKNOWN state, verified travel estimates and freshness labels | A full time-window match implies attendance is feasible |

## A more honest competitor landscape

| Competitor | Demonstrated feature | Research implication |
| --- | --- | --- |
| [Howbout](https://howbout.app/groups) | Group calendar, availability finder, time polls, RSVP/chat; [availability details](https://howbout.app/get-help/find-availability/) | **Do not claim “friends' overlapping free time” or chat are novel** |
| [Partiful](https://help.partiful.com/en-us/articles/15525422-can-i-poll-or-survey-my-guests) | Find-a-Time **Yes/Maybe/No**, RSVPs, guest questionnaires, cohosts, invited guests | Lightweight no-app polls and invitations are solved interaction patterns |
| [Luma](https://help.luma.com/p/searching-for-events) | Discover/search by interest/location/map, host calendars, event registration | Don't rebuild the event publishing stack |
| [SCU official events](https://events.scu.edu/campus-calendar/all) and [club directory](https://www.scu.edu/csi/getconnected/) | Listings, type filters, directories, subscription | Add time-and-person constraints as a **decision layer**, not a duplicate event directory |
| Conventional Google calendars + group chat | Busy blocks and social discussion | Incomplete commitments and missing activity memory need additional representation |

**Differentiation hypothesis needing evaluation:** “We help a group preserve what mattered about a plan when it no longer works, using trusted local opportunities and remembered goals.” Existing apps already support rescheduling, AI scheduling, and group memory, so we must demonstrate that our combined feasibility, provenance and low-friction decision workflow performs better on a representative task.

### Stronger direct competition found in the second research pass

The initial competitor set understated the market. Current self-descriptions show even **AI-based scheduling, structured response semantics, and memory/repair** are being offered elsewhere:

| Product | Actual advertised behavior | SideQuest consequence |
| --- | --- | --- |
| [Cue Events](https://apps.apple.com/us/app/cue-events/id6760505921) | Participants state availability in **natural language**, AI weighs **hard vs soft** constraints and gives a scored explanation; supports rescheduling and live updates | **No novelty claim for LLM availability parsing or constraint-score explanations alone.** Limited independently visible ratings; vendor description is not independent usability verification. |
| [Ask](https://getask.io/) | Plans structure natural text; responses **Going, Suggest, Busy, Pass**; organizer approves proposed changes | **No novelty claim for “Maybe means maybe” or human-confirmed rescheduling alone.** Study semantics and UI, avoid recreating a chat app. |
| [Boba](https://boba.app/) | Works via **existing group chats** with shared memory, planning, research and group decisions; marketed rescheduling and remembering plans | **No novelty claim for group-chat AI memory/replanning alone**. Requires firsthand task testing to identify deficiencies. Read its privacy policy before proposing students route private group messages through an AI. |
| [TimeLoop](https://trytimeloop.com/) | Natural-language time planning with deterministic scheduling and day replanning, including circles for families/friends | A deterministic scheduler behind AI extraction is a **sound pattern**, but not inherently original. |
| [Timeleft](https://timeleft.com/how-it-works/) | Matches strangers into small-group social outings and handles the booking | Distinct social context: SideQuest interviewees mostly wanted to spend time with **existing friends**, rather than meet new people. |

**Stricter differentiating question:** Can SideQuest connect an older specific intention, a particular group’s priorities, and *verified* current local feasible opportunities to produce a better **conditional decision** than Luma + a group chat + existing scheduling AI? This is a testable *hypothesis*, not proven uniqueness.

**Market evidence limitation:** most product-feature claims here are first-party descriptions and app-store listings; we have not run side-by-side competitor task tests. Do not infer competitors cannot perform an action solely because their marketing pages omit it.

### Feature-by-feature competitive audit: what cannot be our novelty claim

| Feature | Competitor evidence | Honest opportunity for SideQuest |
| --- | --- | --- |
| Hosting, event browsing, registration and maps | Luma and SCU official listings | Add clear *personal feasibility* information to real events |
| Shared group calendars and time polls | Howbout and Partiful | Reduce actual decision cost, not merely add another poll |
| Tentative participation semantics | Partiful and Ask | Make uncertainty explicit and prompt only for genuinely unresolved information |
| Natural-language availability and constraint explanation | Cue Events and other scheduling assistants | Treat AI interpretation as provisional and cross-check against facts |
| Group-chat memory and help with reorganization | Boba | Evaluate whether remembered **specific intentions** resurface at truly appropriate opportunities |
| Calendar and day replanning | TimeLoop and conventional calendars | Handle unscheduled activities and ephemeral groups rather than only scheduled tasks |
| Matching strangers for planned social gatherings | Timeleft | Respect that the interviews mostly concern **existing friends**, an importantly different social goal |

**Market-evidence caveat:** current product descriptions can establish that a feature is advertised; they do not establish how reliable, usable, or comprehensive it is. We have not yet run firsthand side-by-side tests, so do not label these products deficient without verification.



## The outside research that deepens the design

1. [Togedule (CSCW 2025)](https://research.ibm.com/publications/togedule-scheduling-meetings-with-large-language-models-and-adaptive-representations-of-group-availability): adaptive choice presentation + LLMs; controlled experiments with total **N=66** found reduced attendee cognitive load and improved organizer speed/decision quality. **Use dynamic prompts that ask only for the unresolved constraints**; don't force a full survey.
2. [“I Want It That Way” (ACM TiiS)](https://doi.org/10.1145/3685053): study shows **calendar data is incomplete** and scheduling requests omit information; tools should elicit/confirm missing duration, preferences and commitments. This is closely analogous but originates largely in meeting scheduling, not student leisure.
3. [Haze / uncertainty in digital scheduling (CHI 2022)](https://www.research.ed.ac.uk/en/publications/exploring-uncertainty-in-digital-scheduling-and-the-wider-implica/): qualitative studies total **21 participants** examine temporal uncertainty and its social implications. **Unknown**, **maybe**, and **cannot commit yet** need real states, not “no.”
4. [groupTime (CHI 2006)](https://hci.stanford.edu/publications/paper.php?id=25): preference-based group scheduling acknowledges social pressure and plausible deniability. **A group member may privately decline to reveal why a time doesn't work**.
5. [Group fairness study (N=399 + 288)](https://link.springer.com/article/10.1007/s11257-023-09363-0): grouping/aggregation method affects perceived fairness and satisfaction; the best method depends on group configuration. **Average scores alone can marginalize a dissenting participant**. Do not claim that attaching longer explanations always improves fairness; this study did not find consistent added value from them.
6. [Sequential group recommendations](https://link.springer.com/article/10.1007/s10844-021-00652-x): average and least-misery aggregation have different failure modes, especially for shifting/ephemeral groups. **Treat each round of planning as a negotiated process rather than one eternal preference ranking**.
7. [Prospective memory and implementation intentions](https://pubmed.ncbi.nlm.nih.gov/19130080/) plus [recognition vs recall](https://www.nngroup.com/articles/recognition-and-recall/): visible, context-triggered ideas can reduce the burden of recalling intentions unaided. SideQuest should **resurface relevant intentions** when a matching opportunity exists; not assume a static saved list will always be revisited.
8. [Satisficing literature](https://pubs.aeaweb.org/doi/10.1257/jel.20201396): under uncertainty, “good enough” choices can be rational. **Aim for a small shortlist meeting hard constraints**, rather than an endless feed ranked by speculative desirability.
9. [Plan commitment / plan repair](https://www.sciencedirect.com/science/article/pii/S0952197623004591) (autonomous-planning paper, **not** a direct user study of leisure): distinguishes full replanning from retaining prior commitments. Apply this as a design analogy: preserve people, time, or activity when they are costly to change.
10. [A Good Plan Is Hard to Find (EMNLP 2025)](https://aclanthology.org/2025.emnlp-main.585/): user preference for a plan is not a reliable proxy for objective success. **Test whether users actually reach a feasible plan, not only which AI explanation feels impressive.**

### Connecting the literature to exact SideQuest interactions

| Research mechanism | Concrete UI implication | What to test empirically |
| --- | --- | --- |
| Calendar incompleteness and missing scheduling parameters | “Are you actually free, or just have nothing recorded?” plus a duration field | Frequency of false-positive feasibility recommendations |
| Temporal uncertainty and social meaning | Separate AVAILABLE / TENTATIVE / UNAVAILABLE / UNKNOWN states | Whether people feel pressured or prematurely committed |
| Adaptive availability representations | Ask only the one unresolved question preventing a decision | Total questions and cognitive load versus a full planning form |
| Fairness in group recommendation | Check each person's non-negotiable needs before comparing aggregated preference | Whether any participant is excluded or ignored |
| Prospective memory / contextual reminders | Resurface a deferred place only when there is a suitable window | Useful rediscovery versus unwanted interruption |
| Satisficing / bounded choice | Provide 2–3 decision-ready viable options rather than an infinite feed | Time to mutually accepted plan and choice overload |
| AI planning preference vs actual success | Pair AI explanations with deterministic checks and source provenance | Grounded correctness, accepted plan, failed attendance or follow-up |

**Transferability warning:** many cited studies investigate meeting scheduling or generic group recommenders, not student leisure. Their findings suggest design hypotheses; they do not prove these SideQuest interactions will work without the proposed usability tests.



## A product design worth prototyping (hypotheses, not shipped features)

### Two entry points, one planning engine

```mermaid
flowchart TB
    A["We have time: what can we do?"] --> F["Feasibility and opportunity evaluation"]
    B["We want to do this: when might it work?"] --> I["Intention memory"]
    C["We want to be together: what fits everyone?"] --> G["Group purpose and constraints"]
    I --> F
    G --> F
    F --> S["2–3 decision-ready options + why/unknowns"]
    S --> P["Tentative or confirmed plan"]
    P --> D{"Something changed?"}
    D -->|"Yes"| R["Repair: preserve people, time, or activity"]
    R --> F
    D -->|"No"| E["Enjoy, reflect, or repeat"]
```

**Example 1: forgotten interest.** User once saved “try rock climbing.” Their current free window is 2–5 p.m., climbing gym open, travel time feasible, friend also interested. Surface “This old idea may fit now” with source and confidence. If hours are stale, clearly label the uncertainty and provide a link to check.

**Example 2: Corpus Christi-style failure.** The group wants a trip but workload conflicts. Offer **keep the people and time, switch to a short dinner**; or **keep the trip as a deferred intention and retry after exams**. Don't presume all participants have agreed just because the organizer selected a replacement.

**Example 3: temporary rotating friends.** One organizer shares a planning link. Others answer simple context questions (“maybe after 3,” “near campus only,” “no car”) without creating a full permanent social calendar. Only confirmed information becomes shared planning state. Private restrictions may yield a simple “this doesn't work for one participant” rather than exposing sensitive details.

### Constraint model (later, not M2)

```ts
type Availability = 'YES' | 'MAYBE' | 'NO' | 'UNKNOWN'
type Hardness = 'REQUIRED' | 'PREFERRED'
type OptionStatus = 'FEASIBLE' | 'CONDITIONAL' | 'INFEASIBLE' | 'UNKNOWN'
type PlanningPriority = 'KEEP_PEOPLE' | 'KEEP_TIME' | 'KEEP_ACTIVITY' | 'LOW_EFFORT'

type Constraint = {
  kind: 'time' | 'travel' | 'budget' | 'participation' | 'weather'
  hardness: Hardness
  source: 'manual' | 'calendar' | 'provider' | 'ai-proposed'
  confirmed: boolean
  visibility: 'private' | 'group'
}
```

Apply **hard constraints first**; identify **unknowns second**; rank by preferences and low burden only among viable candidates. Never translate “unknown” into “no” or an uncertain AI guess into “confirmed.” Group satisfaction requires checking whose preferences are being overridden. These fields are a **design sketch**, not a new M2 TypeScript contract.

## Architecture extensions without trashing M2

- **Preserve now:** typed `CampusEvent` with stable server-generated ID and `hostName`, shared `EventCatalogPort`, deterministic `fitsFully`, and a separate browser-local Schedule of planned Event IDs.
- **Boundary now, no empty classes:** encapsulate `date/start/end` parsing and wall-clock semantics; keep Supabase access behind one adapter; version local Schedule storage; keep UI independent of DB columns. This is the difference between “designed to grow” and speculative overengineering.
- **Add for final product, when features demand:** `Place/Activity` (repeatable unscheduled option), `Intention` (wanted/deferred/completed/rejected), `Plan` (chosen option and commitments), `Constraint/AvailabilityClaim`, `FitEvaluation` (FULL/PARTIAL/NONE/UNKNOWN + reasons), and `OpportunitySource` with provenance/freshness.
- **Keep three different truths separate:** (1) event facts from an organizer or external source, (2) participant-reported preferences/constraints, (3) AI's unverified interpretation. AI cannot fabricate facts or confer permission.
- **Future shared groups require real authorization** or carefully scoped invitation tokens. The current unverified `hostName` is never an account or access-control key.
- **Expect one migration rather than zero changes:** later `EventOccurrence` with timezone/recurrence and plan status requires an explicit adapter/migration from same-day `date/start/end` and `Schedule` IDs. Avoid falsely promising “no rewrite whatsoever.”

## Extra credit: evidence-based plan, actual rubric maximum 5

Original: [Final Project Extra Credit Opportunities](https://docs.google.com/document/d/12slKo80yu17NZw5nbrB0U1C_nj7mLq6h6uQoSbkCVQk/edit?usp=sharing). Core project first; class grade ≥76% beginning of Week 9; good standing; team agreement; individual awards; final presentation can extend up to 5 minutes; **keys kept server-side** per instructor.

| Category | Max | Evidence of good implementation | Best fit / risk |
| --- | ---: | --- | --- |
| Advanced architecture beyond MVC | **1.00** | Clearly justified ports-and-adapters / hexagonal core, dependency directions, real alternate adapters, architecture diagram; explain change in M2 reflection | **High payoff, medium risk.** Renaming existing MVC folders alone is insufficient; check instructor accepts the actual architectural shift |
| Realtime WebSocket | **1.00** | Two browsers: event creation appears without refresh; test reconnect and duplicate events | **High fit** with shared EventCatalog; [Supabase Realtime](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes) offers Postgres Changes (easy) and Broadcast (scales better). Need resolve class key policy |
| External integration/device | **0.75** | Mode-aware real route/travel data, Mapbox or Google Routes, error/unknown handling; demonstrate personal constraint | **High user value**. [Google route matrix](https://developers.google.com/maps/documentation/routes/compute_route_matrix) supports transit; [Mapbox Directions](https://docs.mapbox.com/api/navigation/directions/) focuses on walking/cycling/driving, so provider choice affects interview 2's transit needs |
| Automated browser E2E in CI | **0.50** | [Playwright separate browser contexts](https://playwright.dev/docs/browser-contexts): A posts, B sees, one device plans, other unchanged; [GitHub CI](https://playwright.dev/docs/ci), report attached | **High confidence / low architecture risk** |
| AI API using app data | **0.50** | Ground explanations/conditional alternatives in actual catalog and confirmed constraints; compare result with deterministic baseline; server-only key | **High eventual fit**, but requires enough real data and clear checks |
| Security | **0.50** | Modern auth/authorization/roles if needed for real shared plans or event ownership | **Deferred.** Login contradicts no-account M2 and is unsafe to rush solely for points |
| Accessibility | **0.25** | Manual keyboard + screen reader review, focus, contrast, labels, useful errors | Core-quality win; demonstrate |
| Publishing | **0.25** | Stable public working deployment, no local-only backend; abuse protection for anonymous posts | Core-quality win; demonstrate |
| Advanced external library | **0.25** | Substantial real React usage, not merely installed | Already likely relevant; instructor decides |

**Conditional maximum without security:** 4.5 points if every other category qualifies at its maximum. **All categories sum to 5.0**, but don't chase the maximum at the expense of working core behavior.

### Extra-credit delivery sequence: build evidence, not a trophy shelf

**Recommended order if the team agrees and all core requirements are met:**

1. **Playwright end-to-end tests (+0.25–0.5):** one browser posts, another sees the new Event, matching respects exact boundary conditions, and adding/removing one local plan does not alter the other browser's Schedule. Run automatically in CI.
2. **Accessibility (+0.25):** keyboard-only navigation, focus order, visible validation messages, screen-reader announcements, contrast and controls on mobile. Demonstrate actual testing.
3. **Publishing (+0.25):** an accessible, stable deployed site with real shared persistence. If anonymous posting is internet-facing, address misuse before calling it safe.
4. **Substantial advanced library use (+0.25):** show where React materially supports the architecture; merely installing it does not qualify.
5. **WebSocket real-time (+1):** the second browser sees newly posted events without refresh, reconnection works, and duplicate messages don't create repeated cards. This is useful now and later for group-plan coordination.
6. **External systems (+0.25–0.75):** travel modes and route times or a permissioned calendar connection. A provider lacking public transit would not address the second interviewee's principal transport concern.
7. **AI API (+0.25–0.5):** an app feature interprets preferences and explains *real* SideQuest data, with confirmed human actions and server-side secret keys. Compare against a non-AI baseline.
8. **Advanced architecture (+1):** only if an actual beyond-MVC refactor improves extension and testability; document and justify it in the M2 reflection and provide an architecture diagram.
9. **Security (+0.25–0.5):** potentially valuable when real shared plans need private data and permissions, but adding account infrastructure merely to score points conflicts with the no-account MVP.

**Eligibility and maximum:** The [rubric](https://docs.google.com/document/d/12slKo80yu17NZw5nbrB0U1C_nj7mLq6h6uQoSbkCVQk/edit?usp=sharing) caps extra credit at **5 points**. The class-grade threshold is at least 76% at the beginning of Week 9 after Quiz 2/M2 grades; all core work must be complete; team must agree; each student's eligibility is individual; there is a presentation obligation, and exposed API keys can forfeit extra credit. Without the security category the arithmetic maximum is 4.5 points, **not an expected award**.



### Important credential conflict to resolve *before* architecture lock

The instructor's rubric says **all API keys server-side, never frontend**. Supabase's publishable key is intentionally public and normally used with browser RLS, but **do not assume the professor distinguishes publishable from secret keys**. Ask her whether client-side Supabase publishable keys satisfy the rubric; if not, use a server-side catalog endpoint. It also complicates direct client-side Supabase WebSocket subscriptions. Don't call SSE/polling a WebSocket implementation. Never bundle a service-role or AI-secret key into the React app.

**If classroom and deployment time are short:** finish M2, then secure + test + publish, then real-time updates; use maps and AI only if feasible and testable. Plan a justified advanced architecture refactor for the final phase only if the course rubric can be met without destabilizing the MVP.

## Concrete validation experiments

| Research question | Test task | Outcome to measure |
| --- | --- | --- |
| Is matching within free time enough? | “Find something two people can do 2–5 p.m., no car” | Time to **viable** option, number of outside checks, unsuitable suggestions |
| Do unrecorded commitments matter? | One member says “probably free after 3,” another has unlisted obligations | Whether the system incorrectly declares agreement; error recovery |
| Does a group value its social purpose? | Original trip fails due to availability; propose dinner vs rescheduling trip | Which change is acceptable, what gets preserved, number of messages/steps |
| Does intention memory help? | Reintroduce an activity mentioned during an earlier simulated session | Recall rate, usefulness/timing of resurfacing, perceived annoyance |
| Does fairness need more than average scores? | Three people, one travel-constrained; compare top average vs feasible compromise | Whether someone is effectively excluded; perceived fairness and group willingness |
| Does AI help, or just sound convincing? | Compare deterministic explanation against AI answer for the **same real data** | Correctness of facts/reasons, user task success, unsupported claims |

For baseline, have users perform tasks using their normal Google/Maps/Luma/messaging method (with consent), then test a SideQuest prototype. Avoid claiming statistically significant outcomes from two P1 interviews. Follow up with SCU students outside the original pair, including someone organizing an activity and someone who has been invited but not planning it.

### Full research protocol: compare actual decisions, not screenshots

**Recruitment:** Follow up beyond the two original interviews. Include a student who typically organizes and a student who is usually invited; include participants who use transit, students with unrecorded commitments, and a mix of existing friend groups. Get consent for observing planning activity; don't expose private chats or calendars to demos.

**Baseline:** have participants complete tasks using the tools they actually use (for example group messages, search, maps, or Luma), then a SideQuest prototype with equivalent inputs and realistic, sourced event information. Counterbalance task order where feasible to limit practice effects.

**Task 1 — bounded window:** two friends have Saturday 2–5 p.m. and no car. Record time to a *truly feasible* proposal, irrelevant options and verification steps. Distinguish travel unknown from feasible.

**Task 2 — tentative participant:** a friend says “probably after 3” and has an unrecorded commitment. Record whether the system mistakenly marks attendance confirmed and whether participants can correct it without embarrassment.

**Task 3 — failed group trip:** participants want to spend time together but the planned outing is impossible. Allow (a) keep time + people, switch activity; (b) preserve activity and reschedule; (c) lower effort. Record whether the substitute preserves the group's stated purpose and who has to agree.

**Task 4 — forgotten interest:** a participant saved a place weeks ago. Test whether a later context-sensitive suggestion is useful and non-intrusive, and whether users can defer instead of delete.

**Task 5 — three-person fairness:** one participant cannot use a car. Compare a top-average-interest recommendation with a shortlist filtered by hard constraints and fairness. Record whether anyone gets excluded.

**Task 6 — AI versus verified rules:** provide the same catalog and confirmed inputs to a deterministic baseline and to AI explanation. Check hallucinated costs, times, registration, routes and people; measure completed decisions and appropriate uncertainty, not “sounds convincing”.

**Evaluation:** track time to confirmed plan, number of steps/messages, number of infeasible or unverified suggestions, task completion, whether any participant was excluded, comprehension of why a result is shown, and trust calibration. Use interviews/think-aloud comments to explain observed outcomes. A small student usability study may be persuasive for a course presentation; do not present it as large-sample statistical proof.



## Original interview evidence — detailed field-note table

The following is retained from the team's earlier interview analysis, with the direct source distinguished from product inference. The participants are **two people** and the interviews are **notes, not verbatim transcripts**.

### Evidence-to-design observations

These are **interviewers' notes**, not verbatim interview transcripts. Interview 1 has both primary and secondary notes; Interview 2 contains primary notes and a blank secondary-notes heading in the accessible document. Treat findings as exploratory evidence from **two participants**, not population-level research. The example personas Jordan/Maya were constructed later.

| Observed interview finding | Where it appears | What it suggests | Status |
| --- | --- | --- | --- |
| Interview 1: he searches Google/AI and messages friends on Instagram, Discord, Snapchat or by phone; the group has a **long process deciding and agreeing** | Interview 1 primary notes | Discovery and decision-making are separated across tools; a short feasible shortlist + native share link might remove repeated work | Observed frustration → hypothesis |
| Interview 1: only two or three people go together; friend groups change; friends' availability is a **biggest hindrance** | Interview 1 both note sets | Avoid forcing a permanent friend network just to make a short outing plan; support rotating, plan-scoped groups later | Observed |
| Interview 1: he remembers places through conversation and **sometimes remembers them only after deciding on plans** | Interview 1 both note sets | “Save intention for later” and resurface it when the right moment arrives may be more valuable than a conventional bookmark | Observed → recommendation |
| Interview 1: short outings are often **2–3 hours**, one destination; 30–60 minute travel limit for day trips; evenings are hard because places close | Interview 1 primary notes | Time matching alone is incomplete; account for trip effort, opening hours and transportation only when the later evaluator can validate them | Observed |
| Interview 1: if a place is unavailable, find another place or reschedule | Interview 1 both note sets | Repair should distinguish **keep this time, swap place** from **keep this place, move time** | Observed |
| Interview 2: going with friends matters more than any specific event; participant can feel an outing is pointless alone | Interview 2 primary notes | Group fit and social purpose need explicit representation, not only Event search rank | Observed |
| Interview 2: a desired Corpus Christi outing failed even though participant was ready to do booking and driving; everyone had work and end-of-term commitments | Interview 2 primary notes | **The organizer may shoulder effort while actual availability collapses**; tentative commitments and low-effort substitutes matter | Observed |
| Interview 2: shared availability is hardest to predict **1–2 weeks ahead** because some plans aren't recorded in calendars | Interview 2 primary notes | Calendar import cannot be the only scheduling source. Support manual, tentative, plan-specific availability | Observed |
| Interview 2: registration can close, timing can conflict, transit can rule out options; for driving, acceptable travel may be 15–20 minutes | Interview 2 primary notes | Track freshness and reason codes; avoid a single universal 'distance threshold' for every user | Observed |
| Interview 2: she considers nobody feeling left out important; the group often defaults to nearby Thai food when deciding fails | Interview 2 primary notes | Favor group fairness, close-to-campus fallback choices, and preserving the social occasion over optimizing for novelty | Observed |
| Interview 2: people screenshot event information and send it, using Luma, Instagram, flyers, Maps, Yelp and messages | Interview 2 primary notes | Link/screenshot capture is a strong future idea; does not imply building another entire event-registration system | Observed |
| Interview 2: plans often move a week or turn into something low-commitment like dinner within five minutes' walk of SCU | Interview 2 primary notes | Preserve deferred intentions; support **reduce commitment** as a specific repair operation | Observed |

### Follow-up questions raised by the interviews

1. **When someone says “I'm down,” is that a commitment or tentative enthusiasm?** Interview 2 says group agreement often appears that way, but it doesn't establish that every member can attend.
2. **Is the real unit of success an event attendance or spending time with particular people?** Interview 2 explicitly emphasizes company; a fallback dinner may succeed even when the planned trip fails.
3. **Which constraint is worth saving?** For Jordan it may be a 2–3 hour outing. For the second participant it may be keeping the group together, within transit limits and current workload.
4. **What is the “least costly workable plan,” rather than simply the top-ranked activity?** Two interviewees describe swapping or downgrading outings after scheduling failures.
5. **Where do forgotten ideas live before anyone sets a date?** Interview 1 remembers places late, and interview 2 mentions mentally retaining ideas brought up by friends. A future Intention object solves a different problem from an Event.
6. **How should the system represent an unknown fact?** Registration status, timetable, transit, or uncertain availability should produce UNKNOWN and a suggested check, not a fabricated certainty.

**Research caveat:** some interview notes are fragmented, inconsistent in pronouns or timing, or paraphrased by two different students. We should confirm interpretations with usability tests rather than treating every note as a definitive requirement.



## Engineering expansion rules — preserved from the old roadmap

The diagram in **Figure H** above visualizes these boundaries. The rules below specify how to preserve the working M2 architecture while later adding more capable domain objects.

### Detailed extension points

#### Identity and event source
- Public events use **stable opaque `id`**, never title or hostName as key. Generate IDs in the shared store.
- `hostName` is self-reported display text. It is **not** verified poster identity or permission to edit/delete.
- Keep `EventCatalogPort` as an interface; implementation can change from fake adapter to Supabase to another provider without rewriting the views.
- For future official SCU import, support **provenance and external IDs** at the adapter/data layer when needed: `sourceKind`, `sourceProvider`, `externalId`, `sourceUrl`, `lastCheckedAt`. Distinguish *official record* from *self-reported student post*, and prevent duplicated imported events by unique provider + external ID.
- Do **not** import or claim official verification just because someone typed “SCU” into a host field. Do not scrape private campus systems without authorization.

#### Time semantics: preserve today, isolate tomorrow
- The selected M2 contract uses `date` (YYYY-MM-DD) and `start,end` (HH:mm) **on one day, America/Los_Angeles**. It is a narrower scope than the original P4 separate start/end dates.
- **Do not scatter time parsing throughout React.** Put `toMinutes`, `fitsFully`, validation, duration, and any future timezone conversion in `model/time.ts` or a small dedicated utility; the actual filename is a suggestion.
- Add a **pure conversion boundary** in the catalog adapter so a future `EventOccurrence {startAt,endAt,timeZone}` can be introduced without changing every screen. For M2 it returns the existing format.
- Do **not** insert timezone-converted UTC strings into the current wall-clock format silently. Test exact boundaries, dates and negative duration.

#### The crucial difference between Event, Intention and Plan
- **Event:** a dated occurrence in the world, e.g. “Art Workshop Friday 2:30–3:30”. Other people can discover it.
- **Place or Activity:** a location or general thing to do, e.g. “hike at Alum Rock”. It can have hours, price and conditions without being scheduled as an Event.
- **Intention:** a wish to do an Event, visit a Place, or try an Activity, even with no time selected. May be active, deferred, done, or rejected.
- **Plan:** a chosen activity/event with a selected time, participants, status, and constraints. Could be proposed, tentative, committed, completed, postponed, or canceled.
- **M2 Schedule:** just a list of planned **Event IDs on this device**, with no fake group participation or extra entities. This is a *simple projection* of future personal plans, not the full final Plan model.
- Later, migrate `sidequest.planned-event-ids.v1` into a versioned local `PlanRef` representation via a **one-time tested migration**. Do not retroactively pretend every saved Event was formally RSVP'd or attended.

#### Evaluation, not brittle boolean decisions
- Preserve the tested pure `fitsFully(event,window)` boolean in M2.
- Future callers should use an *additive wrapper* such as:
```ts
type FitStatus = 'FULL' | 'PARTIAL' | 'NONE' | 'UNKNOWN'
type FitEvaluation = {
  status: FitStatus
  reasons: string[]
  usableMinutes?: number
  constraintsChecked: string[]
  constraintsUnknown: string[]
}
```
- M2's evaluation wrapper can map boolean full-fit to FULL or NONE for **time only**. Never label an event “realistically feasible” if distance, registration, transport, or safety is unknown. Use “fits your selected time window”.
- Later modules independently evaluate event timing, participation policy, transit, hours, registration, weather and budget; the orchestrator combines them. Do not bake travel or partial-attendance rules into `CampusEvent` or React UI.

#### Extensible location / costs / participation
- Keep the M2 `location` free-text field. Later add an optional normalized `Place`/geocoded location object and `ParticipationPolicy` rather than changing the meaning of `location`.
- Do not create UI elements and SQL columns for cost, capacity, waitlist, registration, accessibility, or travel until a feature requires them. Plan their interface as optional **feature-specific** metadata.
- An event time window, a location's opening hours, and registration eligibility are distinct kinds of availability; keep them separate in future models.

#### Group and privacy constraints
- For P1's rotating groups, invite-by-link or plan-scoped participation can come before full persistent social networks, **but real shared plans will eventually need identity/authorization or a carefully scoped invitation token**.
- Never assume arbitrary `hostName`/anonymous `posterId` is safe authorization.
- People may be tentative and only willing to participate in one particular plan. Availability is plan-scoped data, not a globally true “free/busy” record.
- Support hard vs soft constraints and confirmation of inferences before building an AI planner. Keep private budgets or scheduling restrictions private even while using a yes/no feasibility answer.

#### Extensibility and testability
- Keep domain models/framework-independent and pure functions for evaluation.
- Views call feature controllers; controllers depend on ports/interfaces; Supabase is one concrete adapter, not imported into every component.
- Separate `EventCatalogPort`, `SchedulePort`, and future `PlaceSource`, `FeasibilityEvaluator`, `IntentionsStore`, `GroupPlanPort`. Don't implement empty abstractions yet; document extension points and add them when there is a real consumer.
- Add repository contract tests and seeded fake adapters for all UI work, including empty/error/slow responses.
- Version localStorage keys and database migrations. Write regression tests for every migration and previously valid schedule ID.



## Original P1/P3 features ranked for the later product

| Feature | Prior source | Priority for final product | Technical prerequisite |
| --- | --- | --- | --- |
| Full/partial/no-fit with explanations and usable attendance time | P3 broader MVP | **High** | FitEvaluation + ParticipationPolicy |
| Transit/walking-time and location feasibility | P0/P3 | **High if reliable travel data can be sourced** | Normalized Place + travel estimator + explicit uncertainty |
| Event source category / official vs student | P3 | **Medium** | Provenance, no falsely verified claims |
| Stable event sharing | P3 | **Quick win** | Shareable URL for `eventId`; ordinary device share sheet |
| Intention list: do later vs no longer interested | P1/P3 later | **Highest strategic priority** | Intention entity + status |
| Resurface an intention when a feasible opportunity appears | P1 | **Highest differentiating value, later** | Intention + evaluator + event/place source |
| Plan repair / substitution / postponement | P1/P3 later | **Highest differentiating value, later** | Plan status + constraints + compare alternatives |
| Friend/rotating group availability, tentative statuses | P1/P3 later | **High** | GroupPlan + scoped participation + privacy |
| Weather, budget, distance filters | P0/P1/P3 later | **Medium** | External data connectors, cached freshness, careful missing-data behavior |
| Calendar integration and uncertain availability | P1/P3 later | **Medium** | Permissioned calendar adapter + manual override |
| Previous experiences and personal/group ratings | P0/P1/P3 later | **Medium** | Experience memory; private by default |
| Off-campus place/activity discovery | P0/P3 later | **Medium** | PlaceSource separated from EventCatalog |
| Conversational group AI assistant | P1 exploratory idea | **Only after actual group planning works** | Confirmed structured constraints, no silent commitments |
| Popularity/gamification and generic recommendations | P1 references, broad market | **Low differentiation** | Validated users; avoid building for novelty alone |



## Final-project demonstration ladder

**Demonstration A — graded MVP:** Poster A creates an event with hostName. Browser B sees it, searches a matching free-time window, adds it to local plans, refreshes, removes the plan, and confirms the public event remains. Show error/empty states, two browsers, meaningful tests, passing CI.

**Demonstration B — strongest next feature:** “I want to try the makerspace workshop, but Saturday doesn't work.” Store an intention with status **deferred**, show why an available event doesn't currently fit, then show a later compatible opportunity. This adds genuine distinction without a huge new social backend.

**Demonstration C — plan repair:** Student has a tentative group outing, but one constraint changes. Compare **keep time, change activity** vs **keep activity, move time**. Show reasons and uncertainties. For the final course project, one polished branch of this decision can be more convincing than half-working calendar, chat, travel and weather integrations.

**Demonstration D — optional group layer:** Two or three participants submit availability for one plan. SideQuest identifies a common window, evaluates candidate activities, then creates a proposed plan. Avoid claiming verified identity if invitations aren't authenticated.

Choose scope by actual time and interview feedback; these are **recommendations**, not bonus-feature requirements.

## 8. A rigorous quality and course-evidence checklist

### Engineering
- Maintain Model–View–Controller separation; draw CRC/ER changes at the assignment milestone.
- GitHub PRs and teammate reviews; run Vitest and production build on every change.
- Test meaningful boundaries: date/time equality, corrupt local storage, duplicate plan IDs, second browser, missing event, hostName persistence.
- Make accessible views: keyboard, focus, labels, validation feedback, mobile layouts, empty/loading/error states.
- Track known limitations honestly: unverified host labels, no account permissions, anonymous spam risk, no live SCU import, same-day-only times, full-fit only.
- Require explicit approval before public deployment; published events require validation, abuse protection, and an appropriate source/ownership policy.

### Evidence for course requirements
- [Fall 2026 syllabus](https://docs.google.com/document/d/1QvOyric501Vr8A7nzD6WWwF3Dp8FdvAkp6l7SAkXee4/edit): software lifecycle, interviews, UX testing, architecture documentation, teamwork, independent technical judgment, exams, AI policy and late policy.
- [M2 Part 2 instructions](https://docs.google.com/document/d/1qIx_8k4ZOGWPrISXNYXf-sOifYsXk3SWoPVkoOBP3es/edit): after MVP, revise full CRC+ER in draw.io and submit individual reflection identifying changes, future key features, contributions and internal deadlines. **The retrieved assignment displays inconsistent date/day text (“Wednesday, Nov. 9th”); check the actual Camino/Gradescope due time rather than relying on that string.**
- [P3 requirements and professor comments](https://docs.google.com/document/d/11Yq8sW1aOphznZHP-zbul2OedCbLJtxczb-ZZDD3oR8/edit): broader MVP list, later list, and optional professor feedback about saving.
- [P1 personas and scenarios](https://docs.google.com/document/d/13OOI6XF8nOiJcPj4t3Jdfxqid2EOuCfh78p7x7cYOGE/edit): Jordan, Maya, intention/plan/opportunity distinctions, uncertainty and adaptive replanning.
- [M1 requirements](../REQUIREMENTS.md) and [specifications](../SPECIFICATIONS.md): current narrower walking skeleton.
- **Extra credit:** [Verified final project bonus rubric](https://docs.google.com/document/d/12slKo80yu17NZw5nbrB0U1C_nj7mLq6h6uQoSbkCVQk/edit?usp=sharing): up to five points, contingent on eligibility, complete core work, approved team choices and actual functioning bonus features. [Raw interview and bonus analysis](#original-interview-evidence--detailed-field-note-table). The separate syllabus oral reassessment is another program.

**Do not publish professor copyrighted slides outside authorized class access.** This page summarizes relevant course instructions and links to student-accessible documents; do not copy lecture decks wholesale.



## Decisions for the four-person team

**Cynthia:** research, accessible information hierarchy, two entry points, comparison/repair prototypes and usability protocol. **Devonny:** event results/details, provenance and link sharing. **Daven:** catalog service, source adapters, real-time publishing and safe endpoints. **Sembiyan:** time matching, pure feasibility evaluation and eventual plan constraints. Agree before anyone writes shared model changes; one teammate integrates App.tsx.

**Timeline:** P5 coursework must be submitted as required separately; M2 prototype remains the three-class vertical slice; after M2 add the new full CRC/ER classes for M2 Part 2. Never instruct coding agents to ship the future models during the current milestone merely because this memo describes them.

## Source bibliography

**Interviews and course:** [raw notes](https://docs.google.com/document/d/1NRX14JTG78lvDj_AUFRzaricBm-QR4vECJiLfvXGu1M/edit), [derived P1 research](https://docs.google.com/document/d/13OOI6XF8nOiJcPj4t3Jdfxqid2EOuCfh78p7x7cYOGE/edit), [P3](https://docs.google.com/document/d/11Yq8sW1aOphznZHP-zbul2OedCbLJtxczb-ZZDD3oR8/edit), [course extra credit](https://docs.google.com/document/d/12slKo80yu17NZw5nbrB0U1C_nj7mLq6h6uQoSbkCVQk/edit?usp=sharing), [earlier interview+rubric synthesis](#original-interview-evidence--detailed-field-note-table).

**Competitors:** [Howbout groups](https://howbout.app/groups), [Howbout availability](https://howbout.app/get-help/find-availability/), [Partiful time poll](https://help.partiful.com/en-us/articles/15525422-can-i-poll-or-survey-my-guests), [Luma search](https://help.luma.com/p/searching-for-events), [SCU event calendar](https://events.scu.edu/campus-calendar/all).

**HCI/research:** [IBM Togedule 2025](https://research.ibm.com/publications/togedule-scheduling-meetings-with-large-language-models-and-adaptive-representations-of-group-availability), [I Want It That Way](https://doi.org/10.1145/3685053), [Haze/uncertainty](https://www.research.ed.ac.uk/en/publications/exploring-uncertainty-in-digital-scheduling-and-the-wider-implica/), [groupTime](https://hci.stanford.edu/publications/paper.php?id=25), [Group fairness](https://link.springer.com/article/10.1007/s11257-023-09363-0), [Group recommender sequential fairness](https://link.springer.com/article/10.1007/s10844-021-00652-x), [prospective memory](https://pubmed.ncbi.nlm.nih.gov/19130080/), [Satisficing](https://pubs.aeaweb.org/doi/10.1257/jel.20201396), [Plan commitment](https://www.sciencedirect.com/science/article/pii/S0952197623004591), [Plan success vs preference](https://aclanthology.org/2025.emnlp-main.585/).
