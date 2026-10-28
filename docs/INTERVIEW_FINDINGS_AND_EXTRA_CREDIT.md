# SideQuest — Original Interviews and Verified Final-Project Extra Credit

**Research correction · October 27, 2026.** Sources were read directly: the team's [actual P1 interview questions and notes](https://docs.google.com/document/d/1NRX14JTG78lvDj_AUFRzaricBm-QR4vECJiLfvXGu1M/edit), the [final project extra-credit document](https://docs.google.com/document/d/12slKo80yu17NZw5nbrB0U1C_nj7mLq6h6uQoSbkCVQk/edit?usp=sharing), and [deck 10 slide 13](https://docs.google.com/presentation/d/1YxzkSxyK5kZIJjCdwa69SmrmPgtytcaWBwcARaJGcm0/edit). This supersedes prior incorrect statements that only the syllabus's oral reassessment was available or that the final project could earn up to ten bonus points. **The verified project maximum is five extra points.**

## 1. Interviews: the underlying observations, before personas

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

### More useful product questions from the raw data

1. **When someone says “I'm down,” is that a commitment or tentative enthusiasm?** Interview 2 says group agreement often appears that way, but it doesn't establish that every member can attend.
2. **Is the real unit of success an event attendance or spending time with particular people?** Interview 2 explicitly emphasizes company; a fallback dinner may succeed even when the planned trip fails.
3. **Which constraint is worth saving?** For Jordan it may be a 2–3 hour outing. For the second participant it may be keeping the group together, within transit limits and current workload.
4. **What is the “least costly workable plan,” rather than simply the top-ranked activity?** Two interviewees describe swapping or downgrading outings after scheduling failures.
5. **Where do forgotten ideas live before anyone sets a date?** Interview 1 remembers places late, and interview 2 mentions mentally retaining ideas brought up by friends. A future Intention object solves a different problem from an Event.
6. **How should the system represent an unknown fact?** Registration status, timetable, transit, or uncertain availability should produce UNKNOWN and a suggested check, not a fabricated certainty.

**Research caveat:** some interview notes are fragmented, inconsistent in pronouns or timing, or paraphrased by two different students. We should confirm interpretations with usability tests rather than treating every note as a definitive requirement.

## 2. Verified Final Project Extra Credit Opportunities

**Original rubric:** [Final Project Extra Credit Opportunities](https://docs.google.com/document/d/12slKo80yu17NZw5nbrB0U1C_nj7mLq6h6uQoSbkCVQk/edit?usp=sharing). Maximum **5 extra points total**; more features do not guarantee more credit.

| Official opportunity | Point range | SideQuest-specific useful implementation | Risk / conditions |
| --- | --- | --- | --- |
| **Advanced architecture beyond MVC** | **+1** | Consider hexagonal/ports-and-adapters with genuinely enforced dependencies, services/adapters/test seams; justify why this architectural shift is better than MVC in M2 reflection, and update diagram appropriately | Not guaranteed by simply renaming folders or having interface types. Significant design cost. |
| **Real-time WebSocket updates** | **+1** | Newly submitted/cancelled events or live group-plan state appear across two browsers without refresh, implemented through verified Realtime changes | Must be a real multi-user no-refresh behavior; test disconnect/reconnect. |
| **External system or device hardware** | **+0.25 to +0.75** | Maps/travel feasibility (directly motivated by both interviews), or Google Calendar with explicit permission; avoid inventing travel times | Award depends on complexity; respect provider permissions and privacy. |
| **Automated end-to-end tests** | **+0.25 to +0.5** | Playwright browser test: post in browser A, browse in B, full-fit result, add/remove plan, check persistence; run in CI | Beyond ordinary unit/integration tests; must genuinely run automatically. |
| **AI API integration with app data** | **+0.25 to +0.5** | Explain why actual published SideQuest events fit a student's expressed time/group constraints; maybe propose a repair, using approved records | Claude/Cline used to *write code* does not qualify. A user-facing app feature using AI API and its own data does. Keep AI API secrets server-side. |
| **Security** | **+0.25 to +0.5** | Modern authentication and scoped authorization if future shared-group/private-plan features truly require it | The rubric examples include OAuth, roles, 2FA. Don't add accounts solely for a bonus if it weakens the current product plan. |
| **Accessibility** | **+0.25** | Keyboard navigation, screen readers, correct labels and contrast throughout actual flow | Also a baseline quality obligation; document verification, not a checkbox claim. |
| **Publishing** | **+0.25** | Public working Vercel/Render site or valid installable phone build | Must function outside a developer's laptop; public anonymous event submission needs abuse protection. |
| **Substantial external advanced library** | **+0.25** | Existing React implementation may qualify if substantial and demonstrated | Merely installing the library is insufficient; the instructor determines credit. |

### Rubric eligibility and demonstration rules

- **Overall class grade at least 76% at the beginning of Week 9**, after Quiz 2 and M2 grades are posted. The rubric heading and lecture slide use slightly different wording; the full document specifies this timing.
- **All core requirements must be met** before any extra-credit work is graded.
- **Good standing:** active team contribution, no missing team assignments or unresolved peer-evaluation concerns.
- **Whole-team agreement** on which extra features to pursue; teammates not eligible aren't required to work on them.
- **Individual awards:** eligible students can earn points even if another teammate isn't eligible.
- **Presentation:** may be **up to five minutes longer** and must explain every extra feature, how it works and why the team chose it.
- **Security:** “All API keys must stay on the server, never in front-end code or on GitHub. Exposed keys forfeit extra credit.” Strictly follow this for third-party and AI secrets. The rubric wording is stricter than the usual Supabase *publishable* key model; ask the instructor how she wants intended-public publishable credentials treated and do not expose any secret/service-role keys.

### Architecture strategy: protect M2, then choose bonus features by actual need

**Recommended near-term bonus portfolio (not guaranteed points):**
1. Accessible published website and substantial React usage: mature the ordinary product and document the demonstration.
2. Playwright E2E in CI: high confidence for a cross-browser MVP and small architecture risk.
3. WebSockets for live new-event updates: directly extends the one shared catalog, later becomes useful for group coordination.
4. Maps/travel estimates: answers concrete interview problems; take missing, uncertain, and mode-dependent routing data seriously.
5. AI assistance over actual event/plan records: only after event data and feasibility rules are trustworthy; model outputs should not silently commit attendees to plans.

**Consider later and skeptically:** security bonus requiring login conflicts with current no-account MVP and adds ownership/privacy work; an advanced architecture bonus needs proof of architectural improvement, not complexity for its own sake. All nine maxima sum to **five points**, but pursuing all nine could threaten core completeness and team time.

## 3. Better demonstration: two interview-rooted scenarios

**Scenario A — forgotten activity, constrained window:** A student remembers a place *after* planning their weekend. Save an intention for later. When an actual Event or activity that matches the allowed time and transport appears, resurface it with clear feasibility reasons. This directly reflects interview 1's memory gap.

**Scenario B — plans collapse, social goal survives:** A student organizes a higher-commitment group outing, but work schedules become incompatible. Preserve participants and the desire to meet; propose a nearby lower-effort choice (perhaps a short meal close to campus) and defer the original activity without marking it rejected. This reflects interview 2's Corpus Christi failure and local-dinner substitutions.

**Build the three-class M2 MVP first.** The intentions, plans, and group scopes above are **future additions** for M2 Part 2's expanded CRC/ER plan or later course stages. Do not quietly ask agents to implement them during the current milestone.

## 4. Source inventory

1. [Original interviewer document and raw notes](https://docs.google.com/document/d/1NRX14JTG78lvDj_AUFRzaricBm-QR4vECJiLfvXGu1M/edit).
2. [P1 personas and derived scenarios](https://docs.google.com/document/d/13OOI6XF8nOiJcPj4t3Jdfxqid2EOuCfh78p7x7cYOGE/edit).
3. [P3 original MVP and later features](https://docs.google.com/document/d/11Yq8sW1aOphznZHP-zbul2OedCbLJtxczb-ZZDD3oR8/edit).
4. [Official bonus rubric](https://docs.google.com/document/d/12slKo80yu17NZw5nbrB0U1C_nj7mLq6h6uQoSbkCVQk/edit?usp=sharing).
5. [Implementation lecture, slide 13](https://docs.google.com/presentation/d/1YxzkSxyK5kZIJjCdwa69SmrmPgtytcaWBwcARaJGcm0/edit).
6. [Current MVP team implementation contract](MVP_IMPLEMENTATION_CONTRACT.md).
