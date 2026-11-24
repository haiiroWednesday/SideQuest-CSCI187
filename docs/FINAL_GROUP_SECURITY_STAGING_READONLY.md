# Group security: read-only HTTPS staging acceptance

**Status: tool ready for review; live authorization not yet established.** The probe lives at `app/scripts/smoke-group-permissions.mjs` and makes **GET requests only**. It never changes data. It can verify existing restricted group and Auth behavior after the backend owner approves staging; it cannot replace independent RLS, revocation, mutation or browser tests.

## 1. Default public preview must remain OFF

On an approved HTTPS preview where group Auth is deliberately disabled:

```bash
cd app
node scripts/smoke-group-permissions.mjs https://YOUR-STAGING-ORIGIN
```

The probe checks `GET /api/auth/status` reports disabled and `GET /api/groups` returns 503. This proves the safety gate, **not** the optional +0.5 security category.

## 2. Controlled, approved live Auth review

**Do not run until Daven and the team approve the group SQL/grants, staging Supabase Auth configuration, and three dedicated disposable test accounts**. The proposed SQL files remain outside `supabase/migrations/` and must not be copied into production without review.

Prepare a **pre-existing** test event and group plan owned by organizer A with invitee B, plus outsider C. After B explicitly accepts the invitation, have B submit a conditional or other response through the already reviewed application UI. Separately test pending invitation preview before acceptance, decline, leave and account deletion in the authorized staging environment. Confirm all three test identities are legitimately authenticated in the approved staging project. Their short-lived access tokens must be supplied as protected shell environment variables, never in CLI arguments, chat, screenshots, issue comments or Git. The probe requires:

| Protected environment variable | Meaning |
| --- | --- |
| `SIDEQUEST_STAGING_ORGANIZER_TOKEN` | Real bearer token for A |
| `SIDEQUEST_STAGING_INVITEE_TOKEN` | Real bearer token for B |
| `SIDEQUEST_STAGING_OUTSIDER_TOKEN` | Real bearer token for C |
| `SIDEQUEST_STAGING_ORGANIZER_ID` | A's provider-verified UUID |
| `SIDEQUEST_STAGING_INVITEE_ID` | B's provider-verified UUID |
| `SIDEQUEST_STAGING_OUTSIDER_ID` | C's provider-verified UUID |
| `SIDEQUEST_STAGING_PLAN_ID` | Existing approved test plan UUID |

Then run, from a **protected environment with process-history-safe credentials**:

```bash
cd app
node scripts/smoke-group-permissions.mjs https://YOUR-STAGING-ORIGIN --approved-live
```

The script performs only these GET checks:

1. `/api/auth/status` reports Auth enabled in this explicitly approved staging environment.
2. Missing or invalid bearer tokens cannot read the test plan (HTTP 401).
3. Organizer A and invitee B can read the expected plan (HTTP 200).
4. Outsider C cannot read the plan (non-disclosing HTTP 404), or discover it through `GET /api/groups`.
5. The group list includes the plan for A and B only.
6. The organizer's plan representation omits B's `privateCondition`; B can read the field only in B's authenticated response. The script never prints any response content, tokens or condition text.

**Limits:** No direct Supabase table query, session revocation, invite/create/respond mutation, two-browser verification, OTP delivery, logging inspection or human review occurs in this script. Those must follow the controlled three-account acceptance procedure in `docs/GROUP_PLAN_SECURITY_CONTRACT.md`. A green read-only test alone does not establish full security credit.

## Result ledger

| Setup | SHA | Reviewers | UTC run time | Result | Redacted log or screenshot |
| --- | --- | --- | --- | --- | --- |
| Default Auth OFF preview | | | | **Not run** | |
| Approved three-account read isolation | | | | **Blocked: staging approval and identities** | |
| Auth expiry/revocation and mutation denial | | | | **Not run** | |
| Direct-table RLS denies outsiders | | | | **Not run** | |
| Full signed-off UX and mobile acceptance | | | | **Not run** | |

Never copy actual private conditions into the log. Disable the optional group flags after a controlled staging run and obtain explicit approval before exposing any live account feature.
