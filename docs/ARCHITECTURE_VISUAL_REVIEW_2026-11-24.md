# Architecture visual review and implementation reconciliation

Reviewed November 24, 2026: all 16 rendered pages of the newest project source `SideQuest_Architecture_Group_Review_v5.1.pdf` (printed pages 01–16). This supersedes the earlier visual review of v4.3 and its separate Sheet B amendment as the design reference. Preserve historical PDFs. The four colors distinguish implemented, feature-gated, open PR and proposed design; live verification is a separate axis. The PDF is a group-review snapshot, not an authorization for new tables or a deployment.

| Page | Visual observation and governing rule | Implementation reconciliation |
| --- | --- | --- |
| 01 | Separate public opportunities, private intentions and shared plans; invitation acceptance creates membership. The footer records the Nov 24 decisions. | Keep Activity deferred, If optional, end_time NOT NULL. Device-local intentions are not account-owned storage yet. |
| 02 | Event occurrences remain individually identifiable. Source Record attests zero or one Event; one Event can have many sources. Category is a code suggestion, not persisted. | #85/#86 implement research, review snapshots and a sync planner; a review-only first-publication SQL path proposes persisted mapping; #92 separately adds a gated read-only feed. |
| 03 | Revision oval moved beneath Plan, clearing Offers. One-tap Works/If/Cannot; optional author-only note. Invitation pending for seven days. | #89 implements optional notes on top of #84 and passed all four workflows at c8dfb87. Future selected-option schema remains open; don't create Activity or Plan Option tables. Acceptance deletes the invitation row, so accepted-as is a transition, not a permanent FK association. |
| 04 | Location Resolution retains original text/pin; Place, Access Point, Use Type, Walk Node and Walkway have different roles. Route Request/Result are derived. | #88 has design preview routes and account/provider proposals; no verified graph is bundled in master. Unknown accessibility never proves step-free access. Don't infer walkability from illustrations or location estimates. |
| 05 | Source and media separate; host picks photos for public view; no-photo venue card is derived. | No real uploads, delivery or moderation implemented. Host-pick rule still needs team confirmation before media SQL. |
| 06 | Actual public.events has required end_time and strict same-day interval; Schedule/Someday are localStorage. Proposed group tables are review-only; no direct grants. | Keep missing-end imports held until host/team supplies a verified end. No cloud personal storage schema approved. #89, rather than #84 alone, adds optional If condition. |
| 07 | CRC separates domain validation, storage ports, FitAssessment, category suggestions, Schedule and routing. AI proposes IDs; deterministic fit checks decide. | Preserve Controller/Model boundaries and no fabricated durations. Map and source resolver remain proposed. |
| 08 | Group CRC cards distinguish invitations, accepted participants, live session, gateway, account lifecycle and sign-in. | Keep 280-code-point optional notes, consent, revision checks and author-only projection. #84 checks signed JWT expiry as well as session existence. |
| 09 | Three trust zones: browser MVC, one Node service, data/providers. EventCatalogPort and CatalogPublisherPort are distinct. | No privileged credentials in browser. WebSocket notices contain public IDs only; AI uses public catalog data; private group RPCs remain gated. |
| 10 | Six request paths show Auth, plan creation, acceptance, response, signed-out token denial and outsider/invitee denial. | #84 and #89 passed disposable stack tests, not hosted staging. If-note length applies only when present; database is authoritative. |
| 11 | Three state machines separate plan state, invitation state and member response. Material changes require renewed consent. | Stale label inside IF box still says private note required; replace with optional author-only note in next drawing. A rescheduled event must not preserve stale consent merely because its UUID stays stable. |
| 12 | Source flow retains provenance, expands verified recurrence, requires genuine occurrence identity, and holds ambiguous records. | Stale Hold box still offers a nullable-end alternative, contrary to page 6. Current decision is NOT NULL; only verified complete intervals may publish. #86 has a review-only first-publication transaction. Updates, cancellation and hosted acceptance still require review. |
| 13 | Four columns separate time fit, map presentation, verified travel, group readiness. Only actual verified routes count. | #88 busy-time gaps are personal filters, not shared availability/RSVP consent. Map styles share one dataset; keep strict M2 fit. |
| 14 | Six external integration rows explicitly identify data crossing boundaries. Maps and Calendar handoffs remain fallbacks. | No Google Calendar read/sync, no private AI data, no geolocation tracking in master. #88's live-location/heading preview requires separate permission and lifecycle review before promotion. |
| 15 | Test and deployment ladder distinguishes isolated tests, disposable Supabase, hosted staging and live acceptance. | Use the live merge guide for current heads and GitHub for exact-head CI. Hosted staging is a separate release gate. |
| 16 | History shows #82/#83 merged; gates include peer review, Nov 25 feature freeze, staging, live acceptance and final diagrams. | Snapshot predates #85–89 and is not an exhaustive live PR inventory. Retain freeze and release gates; don't blindly merge older stacks. |

## Decisions and release constraints

- Keep explicit one-tap attendance, unanswered NULL, optional If note, author-only visibility and explicit Works for confirmation. Daven's architecture feedback is not approval of every SQL change.
- Keep end_time NOT NULL, no guessed end, no publication from incomplete records.
- Defer Activity and multiple Plan options. Saved availability and cross-device Schedule/Someday need a separate proposal and data-isolation tests; do not introduce tables based solely on conceptual relationships.
- Before enabling importer writes, resolve how material source-event changes and cancellations invalidate linked group consent, with transactional canonical mapping and regression tests. Missing feed rows never cancel.
- #88 local demo is distinct from authenticated group implementation. The map preview is not an audited pedestrian network, and media/postcard preview is not delivery.
- Do not claim deployment, external-provider connectivity, instructor approval or extra-credit award from passing CI. No production migrations, credentials, group activation or automatic publication authorized here.

## Drawing corrections for the next revision

Pages 11 and 12 contain visible labels left from earlier decisions; update them as described above. Page 03's accepted-as edge should explicitly denote the acceptance transition, not a stored relationship. Pages 01/03 should avoid implying local Someday data is tied to the signed-in account. Refresh exact-head PR evidence on pages 15/16 and annotate #85/#86/#88/#89 without presenting unmerged work as deployed. Keep the existing corrected Offers routing on page 03.

This note records visual review and implementation alignment. It does not alter the PDF or substitute for team approval.
