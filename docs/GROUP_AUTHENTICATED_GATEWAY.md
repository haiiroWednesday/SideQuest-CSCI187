# Authenticated group HTTP gateway: integration draft

**November 20, 2026 · draft code only · feature OFF by default.**

This branch adds server-only group API routing behind `SIDEQUEST_GROUPS_ENABLED=true`. The flag is intentionally `false` in [`app/.env.example`](../app/.env.example). Do not turn it on for the team instance until the real Supabase Auth provider, proposed SQL RPCs, and their permission tests are approved and installed. M2 EventCatalog and the existing browser-local Schedule/Someday continue to function with the flag off.

## Endpoint contract

| Method | Path | Required body / response | Identity requirement |
| --- | --- | --- | --- |
| GET | `/api/groups` | Authorized plan summaries only | Verified Bearer access token |
| POST | `/api/groups` | `{ eventId }`; returns newly created authorized plan | Verified token; plan owner derived from Auth |
| GET | `/api/groups/:id` | Authorized participant/organizer projection | Verified token and current membership |
| POST | `/api/groups/:id/actions` | `{ expectedRevision, action, ... }`; returns revised projection | Verified token and matching role, revision |

Actions are `invite` or `remove` with an explicit `inviteeId`, `respond` with Works/If/Can't and optional If note, `confirm`, and `cancel`. The browser cannot submit `actorId`, `organizerId` or a target response owner. Input is length-bounded, errors are generic, writes check Host/Origin and rate limits apply. The Node server strips the roster and notes from pending-invitee projections; authorized accepted members and the organizer see If notes only. Direct table access remains denied.

## Server identity and storage

[`app/server/supabaseGroupAccess.ts`](../app/server/supabaseGroupAccess.ts) verifies an access token through Supabase Auth's `getUser(token)`; it does not decode an unverified JWT or trust a user ID supplied in JSON. It invokes the four proposed SQL functions using a fresh caller-token-scoped Supabase client. Neither a service-role key nor an anonymous table-read grant is used. [`app/server/groupApi.ts`](../app/server/groupApi.ts) exposes HTTP endpoints only when the gateway is explicitly configured.

The [review-only schema](../supabase/proposals/20261120000000_group_plan_storage_REVIEW_ONLY.sql) and [RPC proposals](../supabase/proposals/20261120010000_group_plan_rpcs_REVIEW_ONLY.sql) remain outside the deployment migrations. Their isolated test uses a fake Auth subject and proves SQL rule behavior, **not the authenticity of any real JWT**. The HTTP test uses an injected verifier and confirms request validation and output redaction, **not an operational user login**.

## Live feature blockers and acceptance

- [ ] Daven and team select, configure and test a real Auth sign-in/refresh/logout flow. Do not ask students to paste access tokens into a web form or log tokens in analytics.
- [ ] Backend owner reviews and promotes the SQL proposal into a controlled migration, verifies function ownership, grants, `auth.uid()` semantics and changes against the current team Supabase instance.
- [ ] Confirm that authenticated requests pass **verified caller context** to SQL RPCs; use no privileged service key and no broad client grants.
- [ ] Implement sign-in UI and secure session management with lifecycle/expiry handling. The current app has no way for normal users to obtain a session.
- [ ] Implement the group proposal/invite/response UI, with appropriate condition privacy disclosure and a clear failure state.
- [ ] Run a real two-account and unauthorized-third-account test. Include unknown response, conditional response, stale simultaneous edits, revoked invitation, session expiration, and pending invitee/outsider denial and authorized member If-note visibility.
- [ ] Disable the feature again if live authorization, JWT validation, group persistence, or rollback checks fail.

The HTTP endpoint is implemented behind a feature flag to keep the existing M2 public EventCatalog independently functional. **No authentication, invitations, cross-device group persistence or actual shared collaboration can be claimed as complete from this draft alone.**

Official guidance: [Supabase server identity verification](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), and [database function security](https://supabase.com/docs/guides/database/functions).
