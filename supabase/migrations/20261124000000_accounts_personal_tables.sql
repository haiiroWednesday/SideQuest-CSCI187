-- SideQuest accounts, personal part. Signed-in students keep My Schedule, Someday ideas and
-- busy time on every device. Supabase Auth (email code) provides auth.users.
--
-- Groups are NOT in this file. Group plans, invitations, answers and private If notes use the
-- tables and sidequest_group_* RPCs reviewed in PR #84 (group_plans, group_participants,
-- group_invitations), so there is one group design, not two.
--
-- Rules this file enforces in the database, not only in the app:
--   * plans, Someday ideas and busy time are visible to their owner only
--   * each owner keeps at most 100 plans and 100 Someday ideas, as the app does today
--   * a signed-in student posts events under exactly the same checks as everyone else
-- The browser never talks to this database directly: the Node server forwards the signed-in
-- user's token, so every query below runs as that user under these policies.
--
-- Needs a line on review page 6 before it is applied: today Someday and My Schedule are
-- device-only and busy time is never stored.

-- ---------- Events: signed-in students read and post with the existing rules

grant select on public.events to authenticated;
grant insert (title, host_name, description, location, event_date, start_time, end_time)
  on public.events to authenticated;
-- Widen the existing policies to the authenticated role instead of writing looser copies,
-- so the date horizon and posting text rules stay in one place.
alter policy "Anyone may read posted events" on public.events to anon, authenticated;
alter policy "Anyone may submit a valid event" on public.events to anon, authenticated;

-- ---------- Profiles: your own display name

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 60),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
revoke all on public.profiles from public, anon, authenticated;
grant select, insert, update (display_name) on public.profiles to authenticated;
-- Group mates' names reach the app through the #84 RPC projection, never by reading this table.
create policy "Own profile only" on public.profiles for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ---------- Shared limit helper

create function public.sidequest_under_limit(p_table regclass, p_limit int) returns boolean
language plpgsql stable security invoker set search_path = public as $$
declare n int;
begin
  execute format('select count(*) from %s where user_id = auth.uid()', p_table) into n;
  return n < p_limit;
end $$;
revoke all on function public.sidequest_under_limit(regclass, int) from public, anon;
grant execute on function public.sidequest_under_limit(regclass, int) to authenticated;

-- ---------- My Schedule

create table public.my_plans (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);
alter table public.my_plans enable row level security;
revoke all on public.my_plans from public, anon, authenticated;
grant select, insert, delete on public.my_plans to authenticated;
create policy "Read own plans" on public.my_plans for select to authenticated using (user_id = auth.uid());
create policy "Remove own plans" on public.my_plans for delete to authenticated using (user_id = auth.uid());
create policy "Add own plans, up to 100" on public.my_plans for insert to authenticated
  with check (user_id = auth.uid() and public.sidequest_under_limit('public.my_plans', 100));

-- ---------- Someday ideas (same six statuses as the merged model)

create table public.someday_ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  note text not null default '' check (char_length(note) <= 500),
  status text not null default 'saved'
    check (status in ('saved', 'ready', 'proposed', 'deferred', 'completed', 'rejected')),
  event_id uuid references public.events(id) on delete set null,
  -- 'voice' when the idea came from talking, so the app can show the words it heard
  source text not null default 'typed' check (source in ('typed', 'voice')),
  created_at timestamptz not null default now(),
  -- ready and proposed need a real event, as in src/model/someday.ts
  constraint someday_ready_needs_event check (status not in ('ready', 'proposed') or event_id is not null)
);
alter table public.someday_ideas enable row level security;
revoke all on public.someday_ideas from public, anon, authenticated;
grant select, insert, update (title, note, status, event_id), delete on public.someday_ideas to authenticated;
create policy "Read own ideas" on public.someday_ideas for select to authenticated using (user_id = auth.uid());
create policy "Change own ideas" on public.someday_ideas for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Remove own ideas" on public.someday_ideas for delete to authenticated using (user_id = auth.uid());
create policy "Add own ideas, up to 100" on public.someday_ideas for insert to authenticated
  with check (user_id = auth.uid() and public.sidequest_under_limit('public.someday_ideas', 100));
create index someday_ideas_user_idx on public.someday_ideas(user_id, created_at desc);

-- ---------- Busy time (Discover works out free gaps from this plus My Schedule)

create table public.busy_times (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  busy_date date not null,
  start_time time without time zone not null,
  end_time time without time zone not null,
  -- where it came from: typed or dragged, said out loud, or imported from a class calendar
  source text not null default 'typed' check (source in ('typed', 'voice', 'calendar')),
  created_at timestamptz not null default now(),
  constraint busy_same_day check (start_time < end_time)
);
alter table public.busy_times enable row level security;
revoke all on public.busy_times from public, anon, authenticated;
grant select, insert, delete on public.busy_times to authenticated;
create policy "Own busy time only" on public.busy_times for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create index busy_times_user_date_idx on public.busy_times(user_id, busy_date);
