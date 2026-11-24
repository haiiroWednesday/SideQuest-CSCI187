# Authenticated group HTTP gateway: integration draft

**November 23, 2026 · merged disabled foundations (#82); proposed correction #84 · feature OFF by default.**

This branch adds server-only group API routing behind `SIDEQUEST_GROUPS_ENABLED=true`. The flag is intentionally `false` in [`app/.env.example`](../app/.env.example). Do not turn it on for the team instance until the real Supabase Auth provider, proposed SQL RPCs, and their permission tests are approved and installed. M2 EventCatalog and the existing browser-local Schedule/Someday continue to function with the flag off.

## Endpoint contract

| Method | Path | Required body / response | Identity requirement |
| --- | --- | --- | --- |
| GET | `/api/groups` | Authorized plan summaries only | Verified Bearer access token |
| POST | `/api/groups` | `{ eventId }`; returns newly created authorized plan | Verified token; plan owner derived from Auth |
| GET | `/api/groups/:id` | Accepted member/organizer projection or restricted invitation preview | Verified token and current membership or pending invitation |
| POST | `/api/groups/:id/actions` | `{ expectedRevision, action, ... }`; returns revised projection; decline/leave return JSON null | Verified token and matching role, revision |

Actions are `invite` or `remove` with `inviteeId`, recipient `accept`/`decline`, member `leave`, `respond` with Works/If/Can't and optional private condition, `confirm`, and `cancel`. The browser cannot submit `actorId`, `organizerId` or a target response owner. The proposal caps bodies at 8 KiB with early rejection, requires a browser Origin on writes, uses per-verified-account quotas and a fixed process-wide Auth check budget, and distinguishes provider failure (503) from invalid/expired authentication (401). The Node server removes other participants' private conditions even if an upstream RPC mistakenly returns them.

## Server identity and storage

[`app/server/supabaseGroupAccess.ts`](../app/server/supabaseGroupAccess.ts) verifies an access token through Supabase Auth's `getUser(token)`; it does not decode an unverified JWT or trust a user ID supplied in JSON. It invokes the four proposed SQL functions using a fresh caller-token-scoped Supabase client. Neither a service-role key nor an anonymous table-read grant is used. [`app/server/groupApi.ts`](../app/server/groupApi.ts) exposes HTTP endpoints only when the gateway is explicitly configured.

The [review-only schema](../supabase/proposals/20261120000000_group_plan_storage_REVIEW_ONLY.sql) and [RPC proposals](../supabase/proposals/20261120010000_group_plan_rpcs_REVIEW_ONLY.sql) remain outside the deployment migrations. Their isolated test uses a fake Auth subject and proves SQL rule behavior, **not the authenticity of any real JWT**. The HTTP test uses an injected verifier and confirms request validation and output redaction, **not an operational user login**.

## Live feature blockers and acceptance

- [ ] Daven and team select, configure and test a real Auth sign-in/refresh/logout flow. Do not ask students to paste access tokens into a web form or log tokens in analytics.
- [ ] Backend owner reviews and promotes the SQL proposal into a controlled migration, verifies function ownership, grants, `auth.uid()` semantics and changes against the current team Supabase instance.
- [ ] Confirm that authenticated requests pass **verified caller context** to SQL RPCs; use no privileged service key and no broad client grants.
- [ ] Implement sign-in UI and secure session management with lifecycle/expiry handling. Email-code UI exists behind disabled flags; actual OTP delivery and session lifecycle remain unverified.
- [ ] Verify the gated group proposal, explicit invitation acceptance/decline, leave and response UI with real accounts.
- [ ] Run a real two-account and unauthorized-third-account test. Include unknown response, conditional response, stale simultaneous edits, revoked invitation, session expiration, and attempt to read another participant's private note.
- [ ] Disable the feature again if live authorization, JWT validation, group persistence, or rollback checks fail.

The HTTP endpoint is implemented behind a feature flag to keep the existing M2 public EventCatalog independently functional. **No authentication, invitations, cross-device group persistence or actual shared collaboration can be claimed as complete from this draft alone.**

Official guidance: [Supabase server identity verification](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), and [database function security](https://supabase.com/docs/guides/database/functions).

## November 24 security follow-up (#89)

The gateway now rejects detail/action responses for a different plan UUID, even if the caller is a member of both plans, and rejects creation responses for the wrong event or organizer. The OTP endpoint rejects malformed Origin/media type and oversized streaming requests without waiting for the rest of the body. Regression tests exercise the failures with injected providers. Recheck exact-head CI.

Remaining release concerns:
- App sign-out currently clears tab memory; it is not provider-side session revocation. Implement and test an explicit current-session logout before claiming server-side sign-out.
- The Node quotas protect the Node endpoints only. Authenticated clients can call the granted PostgREST RPCs directly. SQL authorization is still enforced, but the Node rate limits do not bound direct RPC creation or other calls. Daven must review an enforceable abuse/retention policy and provider-side protection before public enablement. Do not remove caller-scoped SQL authorization or substitute a privileged server key to solve this.
- The list RPC is the authority for filtering plan summaries; the gateway strips extra fields but its summaries contain no membership evidence. Keep real outsider-list denial tests in disposable and hosted staging acceptance.
- Keep all Auth/group flags off until the approved migration and staging acceptance. No account-owned Schedule, Someday or availability changes in this pass.
