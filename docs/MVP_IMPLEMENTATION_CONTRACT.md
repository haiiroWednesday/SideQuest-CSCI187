# SideQuest MVP — implementation contract

**27 October 2026 · Selected implementation direction for teammate review.** This records the concrete choices Cynthia requested after reviewing M1, P4, and the simplified P5 ER guidance. It is a plan and code contract, **not proof that a Supabase project exists or that the database is deployed**. The team should check the contract together before four agents edit connected features.

## Two implementation decisions

1. **Dates/times: preserve M1's same-day model.** Use one campus-local `date: "YYYY-MM-DD"` and `start` / `end` strings in 24-hour `"HH:mm"` format, with `start < end`. Reject overnight and multi-day events in MVP. This **narrows** P4's separate start/end dates; mention the simplification in updated MVP specs rather than pretending P4 already says it.
2. **Shared catalog: Supabase hosted PostgreSQL.** One shared public `events` table accessed through a React/TypeScript adapter using `@supabase/supabase-js`. Everyone can browse and submit events without app accounts. Under the classroom-demo access model, anonymous visitors have **SELECT and INSERT** only. UPDATE and DELETE remain unavailable. **Personal Schedule stays solely in this browser's localStorage, holding Event IDs.**

`hostName` is required for public display but **self-reported**, and must never be treated as verified user identity. No USER/account table, optional cost/registration system, persistent availability records, PLANNED_ATTENDANCE table, partial attendance, or travel-time estimate.

## Shared TypeScript type (authoritative names for feature branches)

```ts
export type CampusEvent = {
  id: string
  title: string
  hostName: string
  description: string
  location: string
  date: string  // YYYY-MM-DD in America/Los_Angeles
  start: string // HH:mm on date
  end: string   // HH:mm on date, strictly after start
}

export type EventDraft = Omit<CampusEvent, 'id'>

export interface EventCatalogPort {
  create(draft: EventDraft): Promise<CampusEvent>
  listUpcoming(): Promise<CampusEvent[]>
  getById(id: string): Promise<CampusEvent | null>
}

export interface SchedulePort {
  listPlannedIds(): string[]
  add(id: string): { added: boolean }
  remove(id: string): void
}
```

**Existing code is not migrated yet.** M1 currently uses `CampusEvent` with `id,title,location,date,start,end`, a synchronous `createEvent` controller, and the browser-only `sidequest.created-events.v1` store. Add description and hostName carefully; update tests, form, and display consumers in coordinated PRs. Do not delete passing tests. Catalog calls are now asynchronous; adapt UI loading and errors. Catalog IDs come from the database, not from a random string chosen by a browser controller.

**Timezone rule:** treat `date` and `HH:mm` as the wall-clock date and time for Santa Clara campus (`America/Los_Angeles`). Keep the database `date`/`time without time zone` fields as local calendar fields. Do not round-trip them through `Date.toISOString()`, which can shift the event date. Overnight/DST-spanning events are deferred. Validate the full-fit rule as before with inclusive outer boundaries.

## One proposed PostgreSQL table

Daven owns the actual SQL migration. The following is a **reviewable starting point**, not SQL already deployed.

```sql
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 120),
  host_name text not null check (length(btrim(host_name)) between 1 and 120),
  description text not null check (length(btrim(description)) between 1 and 2000),
  location text not null check (length(btrim(location)) between 1 and 200),
  event_date date not null,
  start_time time without time zone not null,
  end_time time without time zone not null,
  created_at timestamptz not null default now(),
  constraint same_day_event_times check (start_time < end_time)
);

alter table public.events enable row level security;
revoke all on table public.events from anon, authenticated;

-- An unauthenticated visitor can only read or submit approved data fields.
grant select on public.events to anon;
grant insert (title, host_name, description, location, event_date, start_time, end_time)
  on public.events to anon;

create policy "Anyone may read posted events"
  on public.events for select to anon using (true);

create policy "Anyone may submit a valid event"
  on public.events for insert to anon with check (true);
```

Review column permissions and policies with `supabase test db` as described in Supabase's [RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security). The database generates `id` and `created_at`. No anonymous UPDATE/DELETE permission is granted. Database `date`/`time` map to the agreed TypeScript strings at the adapter boundary; don't let every feature write independent field translations.

**Important course extra-credit conflict (verify with the professor before deployment):** the [final-project bonus document](https://docs.google.com/document/d/12slKo80yu17NZw5nbrB0U1C_nj7mLq6h6uQoSbkCVQk/edit?usp=sharing) states that **all API keys must stay on the server, never in front-end code or on GitHub**, and exposed keys forfeit extra credit. Supabase normally expects an intended-public publishable client key to be bundled in the frontend and protected by RLS. These two rules need explicit instructor clarification; do **not** assume the Supabase publishable-key exception satisfies her grading condition. If the requirement is literal, use a server-side adapter/proxy for public database operations instead. Never expose service-role, secret, third-party, or AI keys. This affects the choice of catalog adapter, not the Event/Console domain contract.

**Security caveat:** because inserts are anonymous, someone who knows the public endpoint can post fake host names or flood the catalog. SQL constraints and RLS restrict operations and malformed field values, but do not prevent abuse. This is only acceptable for a **limited classroom prototype with monitored access**, not a broad public rollout. Before public deployment, require a separate protected and rate-limited write path (for example a small serverless/Edge Function with abuse checks). Never put a Supabase secret/service-role key into Vite code or a browser. A **publishable** key is intended to be public, subject to RLS.

## Connecting the current React app

1. Daven creates the team Supabase project and applies one reviewed SQL migration. The dashboard permissions are for team developers only; **students using SideQuest still do not log in**.
2. In `app/`, install `@supabase/supabase-js`. Create `app/.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Keep `.env.local` out of Git; document variable **names**, not project secrets, in `.env.example`.
3. Implement **one** `EventCatalogPort` adapter that maps between camelCase (`hostName,date,start,end`) and SQL column names (`host_name,event_date,start_time,end_time`). For tests, provide a fake adapter implementing the identical interface; that fake is not public storage.
4. Devonny uses only the catalog port for browsing and details. Cynthia builds visual components from the agreed `CampusEvent` type. Sembiyan reuses the current full-fit logic with catalog results and stores planned Event IDs in `localStorage`.
5. Replace the M1 *created events* list deliberately rather than calling it My Schedule. Do not auto-upload old local test events into the public catalog.
6. Test a new event across **two independent browsers**, then add/remove a plan in only one browser. The public event must persist, while the other browser's Schedule stays unchanged.
7. Run `npm test`, `npm run build`, and PR CI; add policy tests asserting that anonymous SELECT/INSERT work while UPDATE/DELETE fail.

## Work ownership

| Owner | First deliverable | Acceptance |
| --- | --- | --- |
| **Daven** | Supabase table/migration + `EventCatalogPort` adapter + posting | Valid event appears in another browser, with correct hostName |
| **Devonny** | Browse and event details against the catalog contract | Loads live events, handles empty/error states; no local fake passed off as shared |
| **Sembiyan** | Full-fit search and local Schedule of unique Event IDs | Existing timing boundaries pass; refresh preserves plans locally |
| **Cynthia** | Shared UI components/design language and browsing collaboration | Host, time, place are readable; phone/keyboard/empty states work |
| **Everyone** | Unit tests, reviews, integration, latest-`master` demo | No broken CI and no mutually incompatible schema types |

**Sources:** [existing P4 architecture](https://drive.google.com/file/d/1xiZGXQeScuJx14yKNUcwj1XtWTfOb-l4/view) · [original M1 source](../app/src/model/events.ts) · [full team playbook](MVP_TEAM_PLAYBOOK.md) · [Supabase React quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/reactjs) · [Supabase RLS guide](https://supabase.com/docs/guides/database/postgres/row-level-security).
