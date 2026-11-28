-- REVIEW ONLY. Never applied automatically. Needs Daven's review first.
-- Persistent storage for Google Calendar connections, so a server restart
-- does not disconnect everyone. Today the server keeps these in memory.
--
-- Tokens are sealed with AES-256-GCM on the Node server (SIDEQUEST_TOKEN_KEY)
-- before they reach this table, so the database never holds a usable token.
-- Owners may see that they are connected and may delete the row; they can
-- never read the sealed token columns. The Node server writes token rows with
-- a server-only service role key, because Google's redirect back to SideQuest
-- carries no SideQuest session.

create table public.google_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  sealed_access text not null,
  sealed_refresh text,
  access_expires_at timestamptz not null,
  scopes text[] not null,
  export_enabled boolean not null default false,
  connected_at timestamptz not null default now(),
  constraint google_scopes_known check (scopes <@ array[
    'https://www.googleapis.com/auth/calendar.freebusy',
    'https://www.googleapis.com/auth/calendar.events',
    'openid', 'email', 'profile'
  ]::text[])
);
alter table public.google_connections enable row level security;
revoke all on public.google_connections from public, anon, authenticated;
-- Column grants: the sealed token columns are never readable by the owner.
grant select (user_id, scopes, export_enabled, connected_at) on public.google_connections to authenticated;
grant delete on public.google_connections to authenticated;
create policy "Own Google connection: see" on public.google_connections
  for select to authenticated using (user_id = auth.uid());
create policy "Own Google connection: remove" on public.google_connections
  for delete to authenticated using (user_id = auth.uid());

-- Which Google event mirrors which SideQuest plan, so a change or a drop
-- updates the same Google event.
create table public.google_plan_links (
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null check (char_length(plan_id) between 1 and 80),
  google_event_id text not null check (char_length(google_event_id) between 1 and 1024),
  primary key (user_id, plan_id)
);
alter table public.google_plan_links enable row level security;
revoke all on public.google_plan_links from public, anon, authenticated;
grant select, insert, update, delete on public.google_plan_links to authenticated;
create policy "Own plan links only" on public.google_plan_links
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
