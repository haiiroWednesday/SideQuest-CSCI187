# SideQuest final extra-credit execution and evidence plan
Updated: November 20, 2026. **Planning record, not a grade claim.**

Source of scoring rules: [Kandel's official extra-credit document](https://docs.google.com/document/d/12slKo80yu17NZw5nbrB0U1C_nj7mLq6h6uQoSbkCVQk/edit).
Target: attempt all nine categories (maximum **5.00 points**) without weakening the core release. The professor chooses final credit, especially within ranged categories.

## Eligibility and dependencies

- Overall course grade >=70% at the beginning of Week 9; all core requirements met.
- Active team contribution and no unresolved peer evaluation issues; **team agreement** on chosen extras.
- Extra-credit points awarded per eligible student; preserve contributions and independent explanations.
- Keys stay server-side, never in browser bundles or the repository; exposed keys forfeit extra credit.
- Presentation can add up to five minutes; demonstrate what was built, how it works and why.
- **Architecture +1:** The original **M2 reflection** must justify a refactor beyond MVC and its benefit. The current reflection discusses MVC/ports but does not explicitly document a replacement. Ask Kandel whether the existing work/supplement qualifies; do not claim eligibility without an answer.

## Nine-category evidence register

| Category | Max points | Concrete acceptance target | Status / evidence |
| --- | ---: | --- | --- |
| Beyond-MVC architecture | 1.00 | Material implemented refactor, appropriate replacement architecture diagram, M2-reflection justification, instructor eligibility confirmation | **Eligibility unresolved**, existing ports/adapters reviewed; must ask |
| Real-time WebSocket updates | 1.00 | Two independent browsers; poster creates public event; second Discover updates without reload; same-origin upgrade, failure/reconnect tests | **In progress**, [WebSocket implementation PR](https://github.com/haiiroWednesday/SideQuest-CSCI187/pulls?q=is%3Apr+head%3Afeat%2Fpublic-catalog-websocket-20261120); public events are independent of group auth |
| External system or hardware | 0.75 | **Our own SCU interactive map** using permitted campus location data and opt-in browser geolocation; functional fallback when denied | **Not complete**; PR #54 contains external links and routing foundation, no verified campus graph |
| Automated E2E | 0.50 | Browser black-box workflows running in CI including independent sessions, failures, accessibility checks and regressions | **Strong evidence in master**: Playwright/CI; add actual deployed smoke evidence |
| AI API integration | 0.50 | Server-side AI interprets real public event catalog data; no fabricated event/fit facts, explicit no-key/error handling, prompt-injection and privacy tests | **Not implemented**; requires approved provider and server-held key |
| Security/authentication | 0.50 | Real authentication with server-verified sessions, roles, negative cross-user RLS tests and an authorized deployment test | **Draft only** in PR #60; disabled pending real two-account and third-account denial evidence |
| Accessibility | 0.25 | Keyboard, real screen-reader acceptance, contrast/zoom, documented failures/repairs | **Automated foundation in master**; manual acceptance not yet recorded |
| Publishing | 0.25 | Functioning, publicly accessible HTTPS app with secure environment variables, smoke tests and documented URL | **Unverified**; no deployment claim |
| Advanced libraries | 0.25 | Substantial React usage demonstrated through actual stateful application flows and code review | **Strong candidate in master** |

Maximum: **5.00**.

## First independent implementation: public event WebSockets

A working +1 proof should not depend on group invitations, authentication migrations or localStorage syncing.

1. POST /api/events goes through existing server validation, writes to EventCatalog, then publishes a **small notification** only after a confirmed 201 response.
2. GET /api/events/live upgrades a **same-origin, read-only WebSocket**. No browser credential or student data goes into the pushed message.
3. Other browsers receive a catalog-changed event and refetch GET /api/events; the repository remains authoritative.
4. Demonstrate this on **the actual deployed single-instance Node backend**. Current hub operates only within one process; multiple replicas require shared fanout.
5. CI must test bad origins, invalid posts, read-only semantics, and two independent browser contexts with no reload (dev and built server).
6. Never equate this with group-plan realtime, Supabase realtime authorization, or guaranteed delivery during server downtime.

## Suggested build sequence and handoffs (subject to team agreement)

1. **Immediately:** settle architecture bonus eligibility with Kandel and approve the scope with the team; keep PR #60 as draft pending code/security review.
2. **Independent backend:** public event WebSocket PR, real-browser proof, and secure deployment configuration. Review API and error handling with Daven.
3. **Independent AI:** add narrowly scoped public-catalog natural-language search with a real server-side API, deterministic final fit filtering and a visible no-key fallback.
4. **Custom campus map:** use authorized SCU data, stable Place IDs, verified entrances/edges and our own renderer. Add opt-in device location. Do not substitute Google Maps link-outs for the planned map.
5. **Authentication:** only promote draft group SQL/RPCs after real identities, authorized schema review, denial tests and rollback plan.
6. **Final verification:** use the full regression suite on the **integrated commit**, deployed smoke, manual accessibility, a nine-category presentation evidence table, and accurate editable CRC/ER diagrams.

The final submission's authoritative architecture is **the reviewed as-built code**, not superseded playbooks or a proposed design asserted as completed. Track all unapproved new entities and endpoints separately.
