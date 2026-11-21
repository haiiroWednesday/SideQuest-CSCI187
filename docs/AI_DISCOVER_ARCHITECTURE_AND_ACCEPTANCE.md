# SideQuest AI-assisted Discover: architecture and acceptance

**Status:** implementation branch only; do not claim a working provider deployment or extra-credit award until verified against a real server-held API key. Do not merge automatically into the larger final-project integration draft.

## Product goal and boundary

A student can enter a conversational request such as "a jazz performance or art workshop this weekend." The application offers suggestions **only among its currently published, upcoming, public catalog records**. AI selects candidate event IDs but cannot write events, plan attendance, authenticate users, infer personal availability, create walking routes, or override the strict free-time matcher.

The existing free-time form and ordinary Discover remain fully usable without the AI provider. The AI panel appears only if the shared catalog is connected and `GET /api/ai/status` says the server has an AI key.

## MVC and external-port sequence

1. React `AiDiscoverPanel` asks `controller/aiDiscovery.ts` whether the AI server is available.
2. A deliberate user submit sends `{query}` to the same-origin `POST /api/ai/discover`. The request excludes personal plans, private contacts, calendar data, browser storage and credentials.
3. The **Node-only** `server/aiDiscover.ts` validates origin, size and rate, reads the trusted `EventCatalogPort`, and limits candidates to the first 40 upcoming records.
4. The Node server calls OpenAI's **Responses API** with `OPENAI_API_KEY` in a private Authorization header, `store:false`, no tools, a fixed structured-output JSON schema, and a nine-second deadline.
5. The model proposes **existing event IDs** and optionally an explicit date/full time window. The server discards unknown/duplicate IDs, checks known event dates, applies the existing `findEvents` strict full-fit matcher when all validated date/time fields are present, and returns only safe public event summaries.
6. The browser Controller validates the server response. The View renders matching suggestions as links into the **existing** Event Detail interaction. Suggestions outside an active user-entered free-time filter remain unselectable until that filter is cleared.

The provider output never becomes authoritative event data. An unsupported or ambiguous time request cannot result in a confirmed full fit. The UI labels AI suggestions and time-fit results separately. No manual route, plan or attendance changes result from a search.

## API contract

| Endpoint | Behavior |
| --- | --- |
| `GET /api/ai/status` | `{available:boolean}` only. Does not disclose keys/model |
| `POST /api/ai/discover` | JSON `{query:string}`, 3–240 trimmed characters, same-origin, 2048-byte request ceiling, 5 requests/minute/IP |
| `200` result | `{matches:[{id,title,location,date,start,end}],timeInterpretation:{date,start,end,applied},catalogTruncated}` |
| `400/403/405/413/415/429` | Input, origin, rate or method error, without calling the provider |
| `503` | Missing key/shared catalog, read failure, unavailable provider, invalid/partial model output; no fabricated results |

`catalogTruncated` explicitly tells users that only part of the catalog was considered. It is not a database-search completeness guarantee.

## Server setup

From `app/`:

```bash
cp .env.example .env.local
npm ci
npm run dev
```

Configure `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and optionally `OPENAI_API_KEY` in `app/.env.local`. Set `SIDEQUEST_AI_MODEL` if the default `gpt-6-luna` is unavailable to the project. Vite reads these values **in server middleware only**. Production `npm start` needs those variables configured in the Node host (it does not read `.env.local` automatically).

Keep `OPENAI_API_KEY` out of React, committed files, browser-prefixed variables, images and logs. Set project spending/rate limits and restrict access before a public deployment. The API is deliberately disabled with no key.

Official API references: [Responses create](https://platform.openai.com/docs/api-reference/responses/create), [Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs). This integration performs a genuine API request when configured; mocked tests alone do not meet live API acceptance.

## Regression and extra-credit evidence

- **Server Vitest:** validate public-only payload, actual HTTP shape, declared model/schema, unknown IDs, wrong dates/time windows, invalid request shape, cross-origin denial, rate-limit exhaustion, missing key, provider 503, and 40-record bound.
- **Browser Playwright:** show an available provider, search, open an existing verified event ID, preserve personal plans, respect current free-time filters, and suppress the panel when no key/provider is configured.
- **Live deployed verification still required:** configure a real server-side API key, issue a query, observe a successful API response and real event selection on the publicly hosted HTTPS app, verify timeout/no-key behavior and check the browser bundle for secrets.
- **Team review:** verify that this stays independent of disabled group authentication and PR #61 WebSockets; reconcile with PR #60 only through an integrated, tested branch and accurate final diagrams.

The AI request includes **public event titles, descriptions, hosts, locations, dates and times**. The student should be informed that their typed search request is processed by an external AI provider. No private plan state is sent.

The priority is demonstrable relevance and safe state boundaries, not claiming that semantic suggestions are guaranteed correct.
