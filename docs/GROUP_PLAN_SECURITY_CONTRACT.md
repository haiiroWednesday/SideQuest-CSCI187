# Group planning: implementable security contract (November 20)

**Status: draft domain and server-service code only. Not an active multi-user feature.**
The existing M2 Node server exposes event catalog endpoints. This branch does not expose new group-plan HTTP endpoints, create accounts, apply a migration to Supabase, access credentials, publish invitations, or claim to have tested the team's real database.

## Domain: a plan is distinct from an event and from a private intention

- A `GroupPlan` has its own stable ID, a verified `eventId` from EventCatalog, an authenticated organizer ID, a status, a monotonically increasing revision, and invited `Participant` records.
- An invitation never implies a reply. The initial response is **unknown** (`null`). Explicit answers are `works`, `if`, and `cant`. Only **If** may contain a private condition.
- Organizer actions: invite a different verified user, revoke participation, confirm after **every** invited participant has explicitly answered Works, or cancel. Participant action: change their **own** answer.
- Private condition text is intentionally excluded from another participant's or the organizer's read projection. A public URL is **not** an identity or impersonation capability.
- State changes carry an expected revision, and persistence uses an atomic compare-and-swap. Reconnects/replays reload server state instead of trusting optimistic client state.
- A group plan is a proposal about attending an event, **not** a public event edit, ticket reservation or registration. Existing device-only Schedule and Someday remain separate.

## Required backend decisions before enabling the feature

1. **Identity:** Daven selects the real provider and documents server-verifiable session creation, refresh, revocation and logout. The browser may not choose `actorId` in JSON, URLs or localStorage.
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
- [ ] Wire Node HTTP controllers to a durable GroupPlanRepository and verified principal; test CSRF, session expiry, request limits and transport errors.
- [ ] Run real second-browser invitation and response, including private-note isolation, duplicate-response retry and revoked participant access.
- [ ] Add group UI and, if chosen, genuine server-authorized realtime updates with disconnect/reconnect tests.
- [ ] Update live CRC/ER, specifications, security test matrix, human usability evidence and the final presentation with only proven claims.

**Ownership:** Daven owns backend, identity and actual policies; Sembiyan owns domain response rules; Devonny owns invitation and response UI; Cynthia owns cross-feature integration and negative end-to-end evidence. This draft is a proposed interface, subject to teammate review.

## Review-only SQL schema and isolated checks (November 20)

The schema draft is [`supabase/proposals/20261120000000_group_plan_storage_REVIEW_ONLY.sql`](../supabase/proposals/20261120000000_group_plan_storage_REVIEW_ONLY.sql). It creates `group_plans` and `group_participants` with foreign keys to an existing Event and a provider-managed user, response and condition checks, unique membership, nonnegative plan revision, indexes and **no client table grants or RLS allow policies**. It is intentionally outside `supabase/migrations/`.

The [isolated CI workflow](../.github/workflows/group-sql-review-ci.yml) uses a fresh PostgreSQL 16 container with fake Auth accounts, applies the M2 Event migration and the review-only proposal, then asserts table constraints, denied anonymous/authenticated direct reads, duplicate-member rejection, and correct handling of unknown/conditional responses. This test cannot establish correctness of live Supabase Auth, deployed RLS, RPC permissions, or team-owned data.

**Release blocker:** A UI or browser cannot yet read these tables. That is deliberate. Implement a server-verified actor and authorized, redacted read/write RPCs with atomic revision enforcement first, then have the backend owner explicitly approve promotion to an actual migration after negative cross-user tests. `SECURITY DEFINER` functions must use a fixed search path, narrow grants, explicit authorization and careful review. Never unblock the UI with `grant select on group_participants to authenticated`: that would expose other students' private condition text.

References: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [server identity verification](https://supabase.com/docs/guides/auth/server-side/creating-a-client), and [database function security](https://supabase.com/docs/guides/database/functions).
