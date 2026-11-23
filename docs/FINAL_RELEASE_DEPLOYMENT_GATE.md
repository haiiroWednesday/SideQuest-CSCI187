# SideQuest: release candidate, deployment and evidence gate

**Status:** Review-only, not a deployment or instructor credit claim. Candidate branch: `integration/extra-credit-release-evidence-20261123`, draft PR [#81](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/81), stacked on #78, #74 and earlier reviewed integration work. Check the current head SHA before using these instructions.

## Why a single Node service

The built Vite UI, `GET /api/events`, `POST /api/events`, `POST /api/ai/discover`, and read-only `wss://YOUR-HOST/api/events/live` use the same origin. `app/server/index.ts` runs a **persistent Node HTTP server**; the WebSocket hub is per-process. A static-only site or a serverless HTTP function does not provide the intended WebSocket runtime. This candidate includes a [Render Blueprint](../render.yaml) for a **single-instance Node web service** with HTTPS and WSS support. The linked branch has auto-deploy **OFF**. Free plans can sleep when idle, so wake and check the service before a timed live demonstration.

Host documentation: [Render web services](https://render.com/docs/web-services), [WebSockets](https://render.com/docs/websocket), and [Blueprints](https://render.com/docs/infrastructure-as-code).

## Preconditions, before creating any public service

1. Obtain the team's agreement to staging and the database owner's confirmation of the **exact database project/environment**. Do not use actual student information in tests. Review anonymous public posting risk, posted-content moderation, rate limits, and shutdown/rollback.
2. Select a **staging Supabase project** or explicitly authorized test catalog. The public POST endpoint currently accepts anonymous event creation, with server validation/rate limiting; exposing a production Supabase project without a reviewed abuse plan creates a real risk.
3. Confirm the **current PR #81 head SHA** has passed both CI workflows, including full browser regression and bundle credential audit. Source and deployment must match; no automatic deploy on future changes.
4. Use Render's encrypted environment configuration. The Blueprint's `sync: false` entries require protected setup. **Never paste credential values into GitHub, PRs, screenshots, CI logs or this document.**
5. Leave these flags `false`: `SIDEQUEST_GROUPS_ENABLED`, `SIDEQUEST_AUTH_EMAIL_ENABLED`, `SIDEQUEST_AUTH_ALLOW_SIGNUP`, `SIDEQUEST_PUBLIC_GROUP_LOGIN`. Group SQL is review-only; no group rollout or migration is authorized here.

## Setup path (after permission and credentials)

- Connect the GitHub repository and import [render.yaml](../render.yaml) as a new Blueprint for the **explicit candidate branch**. Confirm the service is a Render **web** service, region Oregon, root directory `app`, Node 24, `npm ci --include=dev && npm run build`, `npm start`, one instance and auto-deploy OFF.
- Supply `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` only through the host's protected environment. Confirm the database policies, event schema and current SQL migrations before testing.
- Optionally configure `OPENAI_API_KEY` through the protected host environment, only after an approved provider account and cost cap. Without it, standard Discover should still work, and AI should be visibly unavailable. The `gpt-6-luna` model ID is part of the candidate, but a successful real API call has **not** been established by mock tests.
- Activate only one explicitly reviewed staging deployment. Confirm its public HTTPS URL, exact source SHA and build logs. Do **not** point the Blueprint at `master` by convenience.
- Do not enable group authentication in the public deployment without approved SQL permissions and three-account denial/consent acceptance tests.

## Read-only deploy smoke

From the **same exact code revision** in the `app` directory, run:

```bash
node scripts/smoke-deployment.mjs https://YOUR-SERVICE.onrender.com --expect-shared
```

When AI config is present, add `--expect-ai`. The script verifies HTTPS HTML, catalog configuration/readability, AI status shape, disabled group email Auth, and a same-origin read-only WSS upgrade. It **does not** create test events, pay for an AI request, or verify that realtime broadcasts arrive.

## Required real demonstrations (manual, authorized)

**WebSockets (+1 candidate):** Two separate browser contexts A and B on the deployed service; B has Discover open. A posts a clearly labeled **authorized test event**. Capture POST success, a public `catalog.changed` frame, and the event appearing in B **without refreshing**. Test a wrong-origin WSS connection, and reconnect after a controlled server restart. Record latency and server instance count. Do not claim multi-instance delivery.

**AI (+0.5 candidate):** With server-held API key and public test catalog populated, enter a natural-language request. Capture the actual provider response status on the server without recording keys/prompts containing personal data; verify UI suggestions map to catalog IDs and an unsupported or invalid time request does not claim a full fit. `/api/ai/status` showing `available: true` by itself **is insufficient**.

**External interaction (+0.25–0.75 candidate):** Demonstrate the **opt-in browser location request** and a separate Google Maps walking-directions handoff, including a denied-permission fallback on a real HTTPS phone. Also show the Google Calendar **draft handoff** and official SCU venue search links. Google Maps provides route calculation; SideQuest currently does not verify pedestrian graph edges, walking time, or accessible entrances.

**Publishing (+0.25 candidate):** Public URL must serve the same tested commit and core post → discover → fit → save/revisit flow. Record URL, SHA, HTTP/WSS response logs, phone screenshot, and credential-leak check. Public static HTML alone is insufficient evidence for WebSocket/AI.

**Security (+0.25–0.5 candidate):** Default preview must keep group Auth disabled. First run the [read-only security staging probe](FINAL_GROUP_SECURITY_STAGING_READONLY.md) in default mode. **Only with Daven's approved database/RLS and three real staging identities** may the explicit `--approved-live` read-only check run; independent mutations, revocation and direct-table RLS checks remain required. Otherwise keep group Auth OFF.

**Other categories:** Use the [editable as-built architecture diagram](diagrams/FINAL_AS_BUILT_PORTS_ADAPTERS.drawio) and the professor's reflection-eligibility decision; final-commit Playwright/coverage; the [accessibility acceptance worksheet](FINAL_ACCESSIBILITY_ACCEPTANCE_2026-11-23.md) for real keyboard/VoiceOver/NVDA, 320/375px and 200% zoom; and substantial React feature demonstration.

## Evidence worksheet

| Category | Exact deployed SHA | Demo owner/date | Setup and inputs | Expected vs observed | Artifact link | Result / blocker |
| --- | --- | --- | --- | --- | --- | --- |
| Architecture | | | | | | |
| WebSocket | | | | | | |
| External system | | | | | | |
| E2E | | | | | | |
| AI | | | | | | |
| Auth/security | | | | | | |
| Accessibility | | | | | | |
| Publishing | | | | | | |
| Advanced library | | | | | | |

## Rollback

- Turn off the staging service or return to the previously verified SHA if a test reveals insecure writes, an exposed credential, missing content provenance, failed WSS, or mismatched database permissions.
- Rotate any accidentally exposed credential immediately in its provider console. Do not attempt to hide a leaked key by deleting only the commit.
- Never auto-apply `supabase/proposals` SQL. A failed group acceptance result means keeping group Auth OFF, even if browser CI is green.

**Core-first rule:** The professor awards extra credit only when the core project requirements are met. Feature readiness must not replace the core acceptance checks or team's required final deliverables.
