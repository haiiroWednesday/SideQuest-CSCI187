# Group planning: implementable security contract (November 20)

**Status: gated group API, email-code authentication and participant UI are implemented in the PR #60 integration candidate, but disabled. The group SQL remains REVIEW-ONLY and has not been promoted or verified against live Supabase.**
The existing M2 public event catalog remains available. The optional Node endpoints live in `app/server/groupApi.ts` and `emailAuthApi.ts`; without the appropriate server flags and approved database setup, group operations return a disabled response. No genuine multi-account acceptance test, live group migration, or secure invitation-discovery workflow has been established.

## Domain: a plan is distinct from an event and from a private intention

- A `GroupPlan` has its own stable ID, a verified `eventId` from EventCatalog, an authenticated organizer ID, a status, a monotonically increasing revision, and invited `Participant` records.
- An invitation never implies a reply. The initial response is **unknown** (`null`). Explicit answers are `works`, `if`, and `cant`. Only **If** may contain a private condition.
- Organizer actions: invite a different verified user, revoke participation, confirm after **every** invited participant has explicitly answered Works, or cancel. Participant action: change their **own** answer.
- Private condition text is intentionally excluded from another participant's or the organizer's read projection. A public URL is **not** an identity or impersonation capability.
- State changes carry an expected revision, and persistence uses an atomic compare-and-swap. Reconnects/replays reload server state instead of trusting optimistic client state.
- A group plan is a proposal about attending an event, **not** a public event edit, ticket reservation or registration. Existing device-only Schedule and Someday remain separate.

## Required backend decisions before enabling the feature

1. **Identity:** The current proposal uses Supabase email OTP and verifies bearer tokens using Supabase Auth. Daven still must approve the live provider configuration, account enrollment, token expiry/revocation behavior and sign-out semantics. The browser may not choose `actorId` in JSON, URLs or localStorage.
2. **Schema:** `group_plans` with `id`, `event_id`, `organizer_id`, `status`, `revision`, timestamps; `group_participants` with `plan_id`, `user_id`, `response` and private condition; restrictive foreign keys and uniqueness. Optional `group_invitations` records must bind a non-guessable invitation to a **specific account** or implement limited one-time claim, never edit arbitrary participant rows.
3. **Authorization:** Server-side plan and participant permissions, database RLS or equivalent, atomic revision update, only organizer inviting/removing/confirming; only current member reading a permitted plan; only response owner reading their private condition. The server should construct `VerifiedServerActor` only *after* authentication.
4. **Transport:** No unauthenticated group-plan route. Every mutation performs real authorization; row-level policies must deny direct anonymous reads/updates. If using Supabase, verify actual deployed RLS with different authenticated principals.
5. **Realtime:** If WebSockets are approved, authorize channel subscriptions and unsubscriptions; broadcast only status and revision, not private conditions; reconnect fetches the canonical authorized view. A message is not authorization.
6. **Consent/recovery:** Clearly label who can see membership and statuses, distinguish tentative from confirmed plans, provide revocation and error/retry states.

## Acceptance checklist

- [x] Pure domain tests: unknown responses, Works / If / Can't, duplicate invites, role denial, private text redaction, conditional confirmation and state immutability.
- [x] Service tests: event lookup, authorization before revision/command processing, atomic compare-and-swap conflict, revoked access, private-note filtering and fail-closed storage.
- [ ] Authenticate real independent accounts in two browser profiles.
- [ ] Apply approved SQL policies to a configured team instance and run negative SELECT/UPDATE tests as different users.
- [x] Implement opt-in Node authentication/group HTTP controllers and participant UI, with simulated identity, privacy and transport regression tests. Live-provider behavior remains unverified.
- [ ] Apply/approve review-only SQL RPCs to a controlled staging Supabase project, verify the real bearer-to-`auth.uid()` path, and test direct-table denial independently.
- [ ] Run real second-browser invitation and response, including private-note isolation, stale/duplicate-response handling and revoked participant access.
- [ ] Verify token expiry, sign-out, account revocation and repeated requests in the actual Auth environment.
- [ ] Review usable invitee identity discovery; the current UUID input is a technical placeholder, not an acceptable general student invitation flow.
- [ ] Run manual mobile/desktop, keyboard, 200% zoom and real-account acceptance checks before enabling group UI. Realtime is separate future work.
- [ ] Update live CRC/ER, specifications, security test matrix, human usability evidence and the final presentation with only proven claims.

**Ownership:** Daven owns backend, identity and actual policies; Sembiyan owns domain response rules; Devonny owns invitation and response UI; Cynthia owns cross-feature integration and negative end-to-end evidence. This draft is a proposed interface, subject to teammate review.

## Review-only SQL schema and isolated checks (November 20)

The schema draft is [`supabase/proposals/20261120000000_group_plan_storage_REVIEW_ONLY.sql`](../supabase/proposals/20261120000000_group_plan_storage_REVIEW_ONLY.sql). It creates `group_plans` and `group_participants` with foreign keys to an existing Event and a provider-managed user, response and condition checks, unique membership, nonnegative plan revision, indexes and **no client table grants or RLS allow policies**. It is intentionally outside `supabase/migrations/`.

The [isolated CI workflow](../.github/workflows/group-sql-review-ci.yml) uses a fresh PostgreSQL 16 container with fake Auth accounts, applies the M2 Event migration and the review-only proposal, then asserts table constraints, denied anonymous/authenticated direct reads, duplicate-member rejection, and correct handling of unknown/conditional responses. This test cannot establish correctness of live Supabase Auth, deployed RLS, RPC permissions, or team-owned data.

**Release blocker:** The proposed group tables and RPCs are not installed in the team database. A gated Node gateway exists, but its working SQL/auth path has only been simulated. The backend owner must explicitly approve any promotion after negative cross-account and real-session testing. `SECURITY DEFINER` functions require a fixed search path, narrow grants, explicit authorization and careful review. Never unblock the UI with `grant select on group_participants to authenticated`: that would expose other students' private condition text.

References: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [server identity verification](https://supabase.com/docs/guides/auth/server-side/creating-a-client), and [database function security](https://supabase.com/docs/guides/database/functions).

## Caller-scoped RPC proposal (not yet deployed)

The additional review-only file [`sidequest_group_*` RPC functions](../supabase/proposals/20261120010000_group_plan_rpcs_REVIEW_ONLY.sql) defines a narrowly controlled way for authenticated members to create and list their plans, read an authorized view, invite/remove participants, answer Works/If/Cannot, and confirm/cancel with expected-revision checks. The functions use `auth.uid()`, `SECURITY DEFINER` with an empty search path, explicit membership/organizer checks, and return author-only private condition text. Direct table access remains denied.

The isolated PostgreSQL [RPC regression script](../supabase/proposals/tests/group_plan_rpc_review.sql) simulates three identity subjects and checks outsider denial, private condition redaction, stale updates, organizer authorization and confirmation rules. Its `auth.uid()` is a **test stub using a PostgreSQL session setting**; it does not verify tokens. Running these functions inside a container does not prove Supabase Auth configuration, real access-token expiry, JWT verification, browser-to-server transport or production migration safety.

**Before promotion:** Daven must review the security-definer ownership and grants, production Auth/JWT path and session revocation behavior, live PostgREST/RLS compatibility, absence of leak routes, and invitation identity UX. Carry out one complete two-account browser test with a third unauthorized account in a controlled instance. Do not copy this proposal straight into the team Supabase SQL editor.

## Source of truth for group actions and regression parity (November 21)

- `app/src/model/groupPlans.ts` defines pure, deterministic reference rules and shared limits/response types. The browser Controller and Node HTTP gateway reuse those TypeScript contracts.
- If group operations are enabled, the PostgreSQL `sidequest_group_*` RPCs are **authoritative** for writes, optimistic revisions, membership and private-note filtering. The Node gateway verifies tokens and redacts outputs again. The pure TypeScript service is a reference implementation and is **not currently invoked** by the RPC gateway.
- `app/tests/group-rule-contract.test.ts` guards shared participant limits, private-note limits and response vocabulary against the review-only SQL text. Isolated SQL tests separately check SQL behavior. Neither validates a live JWT, account configuration or real network path.
- Any proposed change to a transition (including invitations, confirmation or cancellation) must update both the domain reference rules and the SQL proposal, with matching behavioral tests before rollout.

## Controlled three-account acceptance procedure

Use a **nonproduction Supabase project** with approved migrations and three dedicated test users: organizer A, invitee B, and outsider C. Never paste tokens, OTPs, secrets, or private notes into GitHub comments, screenshots or course submissions. Record only the test result, anonymized actor role, timestamp, environment, and redacted HTTP status.

1. Verify the disabled state first: without group flags, `/api/groups` returns HTTP 503 and no private route is advertised.
2. Configure Supabase email OTP for the test project, then sign in A and B in independent browser profiles. Confirm the Node gateway resolves their real authenticated identities; C must have a separate legitimate account.
3. A creates a group plan referencing a real existing catalog event. Confirm it appears in A's list and the event record itself remains unchanged.
4. A invites B by verified account ID in the controlled fixture. B's first response must be pending, with no preselected Works. B answers `cant`, refreshes, and sees `cant` still selected. Repeat with `if` and a private condition.
5. Check that A can see B's response status but cannot retrieve B's private condition through list, read, raw API responses, or direct table queries. C must be denied reads and writes even when given the plan UUID.
6. Submit a stale revision and confirm a conflict instead of a silent overwrite. Revoke B's invitation and verify B loses access; B's old access token must not authorize further group operations.
7. Reinvite B, obtain an explicit Works response, and confirm the plan. A confirmed plan must reject further mutations. Verify an expired or invalid token cannot act.
8. Test mobile, keyboard-only use, screen-reader labels, 200% zoom and error recovery with the actual gated UI. Record observations and close regressions before signoff.
9. Disable the group flags after the controlled test. Promote production SQL and enable the feature only after Daven's security review and the team records the results.

**Current outcome:** This procedure is written for controlled execution. There is no evidence yet that it has been completed with real users or that the group proposal SQL has been deployed. The group feature must remain disabled.
