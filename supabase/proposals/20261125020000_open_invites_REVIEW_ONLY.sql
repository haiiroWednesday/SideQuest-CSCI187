-- REVIEW-ONLY proposal. NOT in supabase/migrations and NOT applied to any database.
-- Daven decides. Deny by default; every write goes through a checked function.
--
-- Open invites ("I'm free, who's in?") and finding a time for a circle of friends.
-- Source rules: app/src/controller/socialPlans.ts, served by app/server/socialApi.ts (flag
-- SIDEQUEST_SOCIAL_ENABLED, off). Names follow review v5.1 Sheet B: CIRCLE, ACTIVITY, FREE WINDOW.
--
-- Privacy, by construction:
--   * No column anywhere stores a position, coordinates or a device location. An activity's place
--     is the text its sender typed.
--   * free_windows rows are owner-only. Nobody else can select them, not even fellow members.
--     Fellow members get only common_free_windows(): the overlap of everyone in the circle who
--     turned sharing on, and only if the caller shares too.
--   * A pending circle invitee sees nothing of the circle (no members, no activities).
--   * Members plus pending invites stay at 12 per circle; joins per activity stay at 11 plus the sender.

create table public.circles (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 40),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.circle_members (
  circle_id uuid not null references public.circles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'invited' check (status in ('invited', 'member')),
  invited_by uuid references auth.users(id) on delete set null,
  joined_at timestamptz,
  primary key (circle_id, user_id),
  check ((status = 'member') = (joined_at is not null))
);
create index circle_members_user_idx on public.circle_members(user_id);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 80),
  -- Typed by the sender. Never a location reading.
  place text check (place is null or char_length(btrim(place)) between 1 and 80),
  -- Optional: an activity does not need a catalog event (review v5.1 open proposal).
  event_id uuid references public.events(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'open' check (status in ('open', 'planned', 'called_off')),
  plan_circle_id uuid references public.circles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (ends_at - starts_at <= interval '16 hours'),
  check ((status = 'planned') = (plan_circle_id is not null))
);
create index activities_creator_idx on public.activities(created_by);

create table public.activity_circles (
  activity_id uuid not null references public.activities(id) on delete cascade,
  circle_id uuid not null references public.circles(id) on delete cascade,
  primary key (activity_id, circle_id)
);
create index activity_circles_circle_idx on public.activity_circles(circle_id);

create table public.activity_joins (
  activity_id uuid not null references public.activities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (activity_id, user_id)
);

-- Per circle, off until the person turns it on.
create table public.free_shares (
  user_id uuid not null references auth.users(id) on delete cascade,
  circle_id uuid not null references public.circles(id) on delete cascade,
  primary key (user_id, circle_id)
);

-- Free stretches only: a start and an end. There is deliberately no title, place or note column.
create table public.free_windows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  check (ends_at > starts_at),
  check (ends_at - starts_at <= interval '16 hours')
);
create index free_windows_user_idx on public.free_windows(user_id, starts_at);

alter table public.circles enable row level security;
alter table public.circle_members enable row level security;
alter table public.activities enable row level security;
alter table public.activity_circles enable row level security;
alter table public.activity_joins enable row level security;
alter table public.free_shares enable row level security;
alter table public.free_windows enable row level security;
revoke all on public.circles, public.circle_members, public.activities, public.activity_circles,
  public.activity_joins, public.free_shares, public.free_windows from public, anon;

-- Membership test used by the policies. Security definer so a policy can read circle_members
-- without granting that table to the caller; it answers only true or false.
create or replace function public.sidequest_is_member(p_circle uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.circle_members m
                 where m.circle_id = p_circle and m.user_id = p_user and m.status = 'member')
$$;
revoke all on function public.sidequest_is_member(uuid, uuid) from public, anon;
grant execute on function public.sidequest_is_member(uuid, uuid) to authenticated;

-- Circles and members: full members see their circle and its members; an invitee sees only their own row.
grant select on public.circles, public.circle_members to authenticated;
create policy circles_members_read on public.circles for select to authenticated
  using (public.sidequest_is_member(id));
create policy circle_members_read on public.circle_members for select to authenticated
  using (user_id = auth.uid() or public.sidequest_is_member(circle_id));

-- Activities: the sender, and full members of any circle it was sent to, while it is not called off.
-- The checks live in security-definer helpers so the policies do not query each other's tables
-- (which would recurse through RLS).
create or replace function public.sidequest_reaches_me(p_activity uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.activity_circles ac
                 join public.circle_members m on m.circle_id = ac.circle_id
                 where ac.activity_id = p_activity and m.user_id = auth.uid() and m.status = 'member')
$$;
create or replace function public.sidequest_can_see_activity(p_activity uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.activities a where a.id = p_activity
                 and (a.created_by = auth.uid() or (a.status <> 'called_off' and public.sidequest_reaches_me(a.id))))
$$;
revoke all on function public.sidequest_reaches_me(uuid), public.sidequest_can_see_activity(uuid) from public, anon;
grant execute on function public.sidequest_reaches_me(uuid), public.sidequest_can_see_activity(uuid) to authenticated;

grant select on public.activities, public.activity_circles, public.activity_joins to authenticated;
create policy activities_read on public.activities for select to authenticated
  using (created_by = auth.uid() or (status <> 'called_off' and public.sidequest_reaches_me(id)));
create policy activity_circles_read on public.activity_circles for select to authenticated
  using (public.sidequest_can_see_activity(activity_id));
create policy activity_joins_read on public.activity_joins for select to authenticated
  using (public.sidequest_can_see_activity(activity_id));

-- Free time: owner-only, every operation.
grant select, insert, delete on public.free_windows, public.free_shares to authenticated;
create policy free_windows_owner on public.free_windows for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and starts_at > now() - interval '1 day' and ends_at < now() + interval '8 days');
create policy free_shares_owner on public.free_shares for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.sidequest_is_member(circle_id));

-- ---------- Writes go through these functions only.

create or replace function public.sidequest_send_invite(
  p_title text, p_place text, p_event uuid, p_starts timestamptz, p_ends timestamptz, p_circles uuid[])
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_c uuid;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  if p_circles is null or cardinality(p_circles) = 0 then raise exception 'pick at least one circle'; end if;
  foreach v_c in array p_circles loop
    if not public.sidequest_is_member(v_c) then raise exception 'not a member of every circle'; end if;
  end loop;
  if p_ends <= now() then raise exception 'that time is over'; end if;
  if p_starts > now() + interval '7 days' then raise exception 'a week ahead at most'; end if;
  insert into public.activities (created_by, title, place, event_id, starts_at, ends_at)
    values (auth.uid(), btrim(p_title), nullif(btrim(coalesce(p_place, '')), ''), p_event, p_starts, p_ends)
    returning id into v_id;
  insert into public.activity_circles (activity_id, circle_id) select v_id, unnest(p_circles);
  return v_id;
end $$;

create or replace function public.sidequest_join_invite(p_activity uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v public.activities;
begin
  select * into v from public.activities where id = p_activity for update;
  if not found or v.status <> 'open' or v.ends_at <= now() then raise exception 'not open'; end if;
  if v.created_by = auth.uid() then raise exception 'it is yours'; end if;
  if not exists (select 1 from public.activity_circles ac where ac.activity_id = p_activity and public.sidequest_is_member(ac.circle_id))
    then raise exception 'not in these circles'; end if;
  if (select count(*) from public.activity_joins where activity_id = p_activity) >= 11 then raise exception 'full'; end if;
  insert into public.activity_joins (activity_id, user_id) values (p_activity, auth.uid()) on conflict do nothing;
end $$;

create or replace function public.sidequest_leave_invite(p_activity uuid)
returns void language sql security definer set search_path = public as $$
  delete from public.activity_joins j using public.activities a
  where j.activity_id = p_activity and j.user_id = auth.uid() and a.id = j.activity_id and a.status = 'open'
$$;

create or replace function public.sidequest_close_invite(p_activity uuid, p_status text, p_circle uuid default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_status not in ('planned', 'called_off') then raise exception 'bad status'; end if;
  if p_status = 'planned' and (p_circle is null or not exists (
      select 1 from public.activity_circles where activity_id = p_activity and circle_id = p_circle)
      or not exists (select 1 from public.activity_joins where activity_id = p_activity)) then
    raise exception 'needs someone in, in one of its circles';
  end if;
  update public.activities set status = p_status, plan_circle_id = case when p_status = 'planned' then p_circle end
  where id = p_activity and created_by = auth.uid() and status = 'open' and ends_at > now();
  if not found then raise exception 'not yours or not open'; end if;
end $$;

-- The overlap of everyone in the circle who shares, at least 30 minutes, next 7 days.
-- Returns nothing unless the caller is a member who shares too. Never returns anyone's own windows.
create or replace function public.sidequest_common_free(p_circle uuid)
returns table (starts_at timestamptz, ends_at timestamptz, shared_count int)
language plpgsql stable security definer set search_path = public as $$
declare v_shared int;
begin
  if not public.sidequest_is_member(p_circle)
     or not exists (select 1 from public.free_shares where user_id = auth.uid() and circle_id = p_circle) then
    return;
  end if;
  select count(*) into v_shared from public.free_shares s
    join public.circle_members m on m.circle_id = s.circle_id and m.user_id = s.user_id and m.status = 'member'
    where s.circle_id = p_circle;
  if v_shared < 2 then return; end if;
  return query
  with per_person as (
    select w.user_id, range_agg(tstzrange(greatest(w.starts_at, now()), least(w.ends_at, now() + interval '7 days'))) as free
    from public.free_windows w
    join public.free_shares s on s.user_id = w.user_id and s.circle_id = p_circle
    join public.circle_members m on m.circle_id = p_circle and m.user_id = w.user_id and m.status = 'member'
    where w.ends_at > now() and w.starts_at < now() + interval '7 days'
    group by w.user_id
  ), everyone as (
    -- A person who shares but has no free window makes the overlap empty, as it should.
    select case when count(*) = v_shared then range_intersect_agg(free) end as common from per_person
  )
  select lower(r), upper(r), v_shared
  from everyone, unnest(everyone.common) as r
  where upper(r) - lower(r) >= interval '30 minutes'
  order by 1;
end $$;

revoke all on function public.sidequest_send_invite(text, text, uuid, timestamptz, timestamptz, uuid[]),
  public.sidequest_join_invite(uuid), public.sidequest_leave_invite(uuid),
  public.sidequest_close_invite(uuid, text, uuid), public.sidequest_common_free(uuid) from public, anon;
grant execute on function public.sidequest_send_invite(text, text, uuid, timestamptz, timestamptz, uuid[]),
  public.sidequest_join_invite(uuid), public.sidequest_leave_invite(uuid),
  public.sidequest_close_invite(uuid, text, uuid), public.sidequest_common_free(uuid) to authenticated;

-- Members plus pending invites stay at 12 per circle.
create or replace function public.sidequest_circle_cap() returns trigger language plpgsql as $$
begin
  if (select count(*) from public.circle_members where circle_id = new.circle_id) > 12 then
    raise exception 'a circle holds 12 people, invites included';
  end if;
  return new;
end $$;
create trigger circle_members_cap after insert on public.circle_members
  for each row execute function public.sidequest_circle_cap();

comment on table public.free_windows is 'Owner-only free stretches. No title, place or location columns by design. Others see only sidequest_common_free().';
comment on table public.activities is 'Open invites. place is typed text, never a location reading.';
