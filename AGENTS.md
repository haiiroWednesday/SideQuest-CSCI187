# SideQuest — instructions for coding assistants

**Read these before suggesting changes.** This project is a course assignment; a human teammate owns every PR and approves scope. This file provides common context for agents (including Cline); it does **not** launch agents.

## Final-project implementation handoff (November 20)

**Implementation agents and teammates working on the November final-project branches must first read [FINAL_PROJECT_IMPLEMENTATION_ARCHITECTURE.md](docs/FINAL_PROJECT_IMPLEMENTATION_ARCHITECTURE.md).** Its work orders W0–W7 specify module boundaries, reviewed data contracts, exact PR dependencies, campus-map evidence gates, group-plan permission requirements, and release tests. Start with the audited current branch and do **not** implement unapproved speculative features or map routes.

- **Merged `master`:** the established M2 event catalog, same-day strict time fit, public event API and device-local Schedule; posting-only text rules (#38) are merged.
- **Draft integration:** #49 (Schedule details/timeline, Someday, fit explanations) → #53 (categories/Calendar draft and unexposed group-plan foundation) → #54 (external map links and graph algorithm). These are not yet merged releases. Do not merge the individual constituent branches and the composite integration again.
- **Map truth:** #54 adds official SCU map/search links plus a pure shortest-path routine on supplied test graphs, **not** a surveyed internal SCU map. Never claim verified walking routes, times, step-free access, or fabricated coordinates before data and human validation.
- **Group truth:** no deployed identity/session/RLS or exposed multi-user Plan API. Neither a public link nor browser-provided `actorId` is an authorized student.
- **Testing:** Review the exact integrated SHA using `npm run test:regression`, SQL/permission CI, browser focus/keyboard and mobile checks. Do not treat earlier PR-head tests as proof that the combined product passes.

## Source of truth

- **[MVP playbook](docs/MVP_TEAM_PLAYBOOK.md)** — authoritative **M2 code contract**, architecture diagrams and tests, plus the separately identified [current P5 coursework ER](docs/MVP_TEAM_PLAYBOOK.md#p5-coursework-er-diagram--current-drawio-and-mermaid), classroom sketch and original Google Docs.
- **[Team setup + coding agents](TEAM_SETUP_GUIDE.md)** — Git, VS Code, OpenCode/Cursor/Claude Code/Codex/Cline options, optional specialist agents, safe PR reviews.
- **[Product research and roadmap](docs/DEEP_RESEARCH_PRODUCT_STRATEGY_2026.md)** — raw interviews, comparison research, validated extra-credit rubric, **future-only** features. Do not expand M2 automatically.

- [P4 architecture Google Doc](https://docs.google.com/document/d/11MKHb3f40Yl81Rx__Mna2lRFf5ooZZUD22QEUnmpiO4/edit): Event, EventCatalog, Schedule, MVC responsibilities.
- [Current editable P5 ER draw.io](https://drive.google.com/file/d/1gzbESV0y6hdACNoPJeH3hnO1zxFQ54Lv/view): USER, EVENT, AVAILABILITY_WINDOW and PLANS TO ATTEND for **P5 coursework**. This is **not** the M2 implementation schema, even though it is the selected P5 drawing.
- [README](README.md) and [TEAM_SETUP_GUIDE](TEAM_SETUP_GUIDE.md): how to run and test the actual app.
- [Current M2 requirements](REQUIREMENTS.md) and [M2 specifications](SPECIFICATIONS.md) are authoritative for implemented features; archived M1 documents under `docs/M1_HISTORICAL_*.md` are assignment history.
- [Lecture 01–16 compliance audit](docs/COURSE_LECTURES_01_TO_16_COMPLIANCE_AUDIT.md) maps course lectures to actual code, defects and remaining release checks.

## M1 feedback integration notice

- Earlier M1 code PRs #10 and #11 were closed unmerged and superseded by [PR #12](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/12), **merged into `master`** as commit `6e461fd`. Final PR-head CI passed **59 Vitest tests**, a Chromium smoke test, and the TypeScript/Vite build.
- Read [M1 post-feedback QA](docs/M1_POST_FEEDBACK_QA.md) for the verified branch/CI and lecture-alignment checklist. M1 post-feedback changes are now on `master`. Do not expand the agreed M2 scope automatically.

## Agreed MVP scope

- Anyone may post/browse events; **no account, login, or USER table**.
- Every public Event has `id,title,hostName,description,location,date,start,end`. `hostName` is unverified display text, **not** a user ID.
- Use M1-compatible `date` (YYYY-MM-DD) and `start,end` (HH:mm) on the **same day**, with `start < end`. No overnight events in this MVP.
- One **shared public EventCatalog**; adapter, Post/Discover/Schedule and seven-field schema are merged. There is an isolated PostgreSQL/RLS CI suite and Daven's reported live permission checks, but do not claim a **verified live deployment or cross-browser shared acceptance** until the team records exact environment, migration SHA and independent-browser evidence. Without Node/Supabase configuration, the UI labels the browser-local fallback.
- **Schedule** stores planned Event IDs **on the current device**. Removing a plan does not delete the public Event.
- Free-time matching requires the **entire** event to fit, inclusive boundaries. No partial matching or travel feasibility.
- Out of scope: user profiles, cost, registration enforcement, saved availability, cross-device schedules, and extra tables for anonymous users.

## Boundaries and ownership

- **Cynthia:** shared design system, reusable React components, discovery UX.
- **Devonny:** event browsing/details, coordinating UI with Cynthia.
- **Daven:** event creation, catalog adapter, database schema.
- **Sembiyan:** full-fit matching, local Schedule.
- **All:** tests, documentation accuracy, peer review, integration.
- Model holds data/validation/fit; controllers coordinate actions; React components present views. Do not implement persistence inside UI components.
- A single teammate should integrate `App.tsx` changes at a time. Ask before changing shared `CampusEvent` fields or catalog APIs.

## Current integration and review cautions

- Posting, full-fit search, and My Schedule now consume the same EventCatalog (#20). The app's public sharing still requires a real Supabase project and a two-browser verification; never call the fallback public.
- **Posting-only rules merged in #38:** new titles 80, hosts 60, descriptions 1,000 and locations 120 characters, with letter/digit validation. **Legacy read/storage limits remain** title/host 120, description 2,000, location 200. Read paths and Schedule must retain valid older data without silent truncation or resetting it. See `POSTING_LIMITS` and `CATALOG_LIMITS` in `app/src/model/eventCatalog.ts`.
- Posting restrictions belong in the EventCatalog **Model** as well as UI feedback; direct `catalog.create()` calls cannot bypass the rule.
- The historical PR #13 was based on an M1-only app and is not safe to merge wholesale. Port remaining useful fixes onto current `master`, rerun CI, and prevent regression of #18–#20.
- PR #16 (Claude team-access documentation) is merged; setting up workspace membership, API keys and actual spending controls is a separate account action, not an effect of Git commits.
- M2 Part 1 requires current MVP README, requirements, specs, CRC/ER, code and tests. Do not submit obsolete M1 documents as if they describe the current MVP.
- The final-project conceptual ER/CRC includes future Student/Place/Plan/Intention/Source concepts. Keep current-as-built and proposed entities visually separated; no fabricated storage tables or GIS dataset.

## Consistent implementation across teammates

Follow the [shared coding conventions](TEAM_SETUP_GUIDE.md#shared-coding-conventions). Preserve the Model–Controller–View separation and the M2 EventCatalogPort contract. Use explicit M2 versus legacy event types, named constants, extensionless imports, two-space indentation, and comments about decisions rather than authors. Protect asynchronous reads against stale responses. Keep contributor credit in Git and PR reviews. Do not introduce new domain rules or source formats without tests and team approval.

## Safe development protocol

1. Check `git status` and work on a feature branch from current `master`; never overwrite another teammate's uncommitted work.
2. **Plan first**, list touched files, risks, and tests; do not make unrequested architecture changes.
3. Implement one focused feature change, with real assertions and meaningful negative/edge tests.
4. Inside `app/`, run `npm test` and `npm run build`. Report actual output, not an assumed pass.
5. Review `git diff`; ask before commits, pushes, PR creation, database migrations, deployment, secret access, destructive commands, or merges.
6. Keep secrets off GitHub and out of browser bundles. All Supabase keys, including publishable keys, stay on the Node server. Browser code calls the same-origin HTTP port; never expose database credentials in front-end code or Git.
7. Use the smallest working change; preserve M1 behavior and tests unless the team intentionally replaces them.

**Default:** If a prompt conflicts with the agreed implementation contract or another teammate's file ownership, stop and explain the conflict. Do not invent features.

**The P4 diagram is accepted.** Keep it unchanged. Current M2 source diagrams are [CRC](docs/diagrams/M2_CRC.drawio) and [ER](docs/diagrams/M2_STORAGE_ER.drawio), with a [combined file](docs/diagrams/M2_IMPLEMENTATION.drawio). Use the current [README](README.md), [specifications](SPECIFICATIONS.md) and [M2 verification](docs/M2_INTEGRATION_VERIFICATION.md), not historical M1 walkthroughs. Do not reuse a local server when running Playwright: browser tests POST events and a developer server may have real Supabase credentials.
