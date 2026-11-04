-- SideQuest M2: the one shared public EventCatalog table.
-- Source: docs/MVP_TEAM_PLAYBOOK.md, "Proposed Postgres storage and SQL".
-- Owner: Daven. NOT YET APPLIED to any Supabase project. Apply only after team review.
--
-- No USER, AVAILABILITY_WINDOW or planned-attendance tables: hostName is
-- unverified display text, and each browser keeps its planned event IDs locally.
-- Length limits must stay in sync with CATALOG_LIMITS in app/src/model/eventCatalog.ts.

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

-- An unauthenticated visitor can only read, or submit the approved data fields.
-- No anonymous UPDATE or DELETE: without accounts, nobody can prove they own a post.
grant select on public.events to anon;
grant insert (title, host_name, description, location, event_date, start_time, end_time)
  on public.events to anon;

create policy "Anyone may read posted events"
  on public.events for select to anon using (true);

create policy "Anyone may submit a valid event"
  on public.events for insert to anon with check (true);
