-- Behaviour test for 20261125030000_open_invites_REVIEW_ONLY.sql on a scratch database, as its owner.
-- Run: supabase/tests/fixture/auth_stub.sql, the migrations, the proposal, then this file
-- (`bash supabase/tests/run-all.sh` does all of that). Every check raises an exception, so psql
-- stops with a non-zero exit on the first broken rule. One transaction, rolled back.
-- Users: A (sender), B (member), C (member, does not share), D (invited only), E (outsider),
-- F (only in a second circle, Benson).
--   A sends; past time refused; direct insert refused; plan with nobody in refused; A cannot join own
--   B sees 1 and joins; D (invited only) sees 0 invites, only their own member row, cannot join
--   E (outsider) sees 0 invites, 0 circles, 0 common time, cannot join
--   nobody sees anyone else's free windows; common time needs the caller to share and 2 sharers
--   after A and B share: one 2-hour overlap, shared_count 2; C (not sharing) still gets nothing
--   sharing into a circle you are not in refused; a window past the 8-day horizon refused
--   A makes it a plan; B can no longer leave; A cannot call off a plan; 13th circle member refused;
--   no location-like columns
\set ON_ERROR_STOP 1
begin;

\ir ../../tests/fixture/sqtest.sql

insert into auth.users(id,email,email_confirmed_at)
select ('00000000-0000-0000-0000-00000000000' || suffix)::uuid, suffix || '@scu.edu', now()
from unnest(array['a','b','c','d','e','f']) as t(suffix);
insert into public.circles (id, name, created_by)
  values ('11111111-1111-1111-1111-111111111111', 'Swig', '00000000-0000-0000-0000-00000000000a'),
         ('22222222-2222-2222-2222-222222222222', 'Benson', '00000000-0000-0000-0000-00000000000f');
insert into public.circle_members values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-00000000000a', 'member', null, now()),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-00000000000b', 'member', '00000000-0000-0000-0000-00000000000a', now()),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-00000000000c', 'member', '00000000-0000-0000-0000-00000000000a', now()),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-00000000000d', 'invited', '00000000-0000-0000-0000-00000000000a', null),
  -- A second, real circle that only F is in, so "not a member" is tested against a row that exists.
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-00000000000f', 'member', null, now());
set local role authenticated;

-- ---------- A sends an invite to Swig
select sqtest.as_user('00000000-0000-0000-0000-00000000000a');
do $$
declare v uuid;
begin
  v := public.sidequest_send_invite('Boba run', 'Benson', null, now() + interval '1 hour', now() + interval '2 hours',
                                    array['11111111-1111-1111-1111-111111111111']::uuid[]);
  if v is null then raise exception 'FAIL A sends: no id'; end if;
  -- Kept for the later blocks, which run as users who cannot select it.
  perform set_config('sqtest.activity', v::text, true);
  perform sqtest.eq('A sees own invite', (select count(*) from public.activities), 1);

  perform sqtest.refused('A sends to a past time',
    $s$select public.sidequest_send_invite('Late', null, null, now() - interval '2 hours', now() - interval '1 hour',
       array['11111111-1111-1111-1111-111111111111']::uuid[])$s$, 'P0001', 'that time is over');
  perform sqtest.refused('A sends to a circle they are not in',
    $s$select public.sidequest_send_invite('Elsewhere', null, null, now() + interval '1 hour', now() + interval '2 hours',
       array['22222222-2222-2222-2222-222222222222']::uuid[])$s$, 'P0001', 'not a member');
  perform sqtest.refused('direct insert into activities',
    $s$insert into public.activities (title, starts_at, ends_at) values ('direct write', now(), now() + interval '1 hour')$s$,
    '42501');
  perform sqtest.refused('A plans with nobody in',
    format($s$select public.sidequest_close_invite(%L, 'planned', '11111111-1111-1111-1111-111111111111')$s$, v),
    'P0001', 'needs someone in');
  perform sqtest.refused('A joins own invite',
    format('select public.sidequest_join_invite(%L)', v), 'P0001', 'it is yours');
end $$;

-- ---------- B sees it and joins
select sqtest.as_user('00000000-0000-0000-0000-00000000000b');
do $$
begin
  perform sqtest.eq('B sees invites', (select count(*) from public.activities), 1);
  perform public.sidequest_join_invite(current_setting('sqtest.activity')::uuid);
  perform sqtest.eq('B joined', (select count(*) from public.activity_joins), 1);
end $$;

-- ---------- D (invited only) and E (outsider) see nothing and cannot join
select sqtest.as_user('00000000-0000-0000-0000-00000000000d');
do $$
begin
  perform sqtest.eq('D (invited) sees invites', (select count(*) from public.activities), 0);
  perform sqtest.eq('D sees joins', (select count(*) from public.activity_joins), 0);
  perform sqtest.eq('D sees members', (select count(*) from public.circle_members), 1);
  perform sqtest.eq('D sees own member row only',
    (select count(*) from public.circle_members where user_id <> auth.uid()), 0);
  perform sqtest.eq('D sees circles', (select count(*) from public.circles), 0);
  perform sqtest.refused('D joins',
    format('select public.sidequest_join_invite(%L)', current_setting('sqtest.activity')), 'P0001', 'not in these circles');
end $$;
select sqtest.as_user('00000000-0000-0000-0000-00000000000e');
do $$
begin
  perform sqtest.eq('E sees invites', (select count(*) from public.activities), 0);
  perform sqtest.eq('E sees circles', (select count(*) from public.circles), 0);
  perform sqtest.eq('E sees members', (select count(*) from public.circle_members), 0);
  perform sqtest.refused('E joins',
    format('select public.sidequest_join_invite(%L)', current_setting('sqtest.activity')), 'P0001', 'not in these circles');
end $$;

-- ---------- Free time: windows are owner-only; common time needs sharing
select sqtest.as_user('00000000-0000-0000-0000-00000000000a');
do $$
begin
  insert into public.free_shares values ('00000000-0000-0000-0000-00000000000a', '11111111-1111-1111-1111-111111111111');
  insert into public.free_windows (starts_at, ends_at)
    values (date_trunc('hour', now()) + interval '26 hours', date_trunc('hour', now()) + interval '29 hours');
  perform sqtest.refused('A saves a window past the 8-day horizon',
    $s$insert into public.free_windows (starts_at, ends_at) values (now() + interval '9 days', now() + interval '9 days 1 hour')$s$,
    '42501');
  perform sqtest.eq('A common with one sharer', (select count(*) from public.sidequest_common_free('11111111-1111-1111-1111-111111111111')), 0);
end $$;

select sqtest.as_user('00000000-0000-0000-0000-00000000000c');
do $$
begin
  perform sqtest.eq('C common before sharing', (select count(*) from public.sidequest_common_free('11111111-1111-1111-1111-111111111111')), 0);
  perform sqtest.eq('C sees A free windows', (select count(*) from public.free_windows), 0);
  perform sqtest.eq('C sees A shares', (select count(*) from public.free_shares), 0);
end $$;

select sqtest.as_user('00000000-0000-0000-0000-00000000000b');
do $$
declare r record; n int := 0;
begin
  perform sqtest.eq('B common before sharing', (select count(*) from public.sidequest_common_free('11111111-1111-1111-1111-111111111111')), 0);
  insert into public.free_shares values ('00000000-0000-0000-0000-00000000000b', '11111111-1111-1111-1111-111111111111');
  insert into public.free_windows (starts_at, ends_at)
    values (date_trunc('hour', now()) + interval '27 hours', date_trunc('hour', now()) + interval '31 hours');
  perform sqtest.eq('B sees A free windows',
    (select count(*) from public.free_windows where user_id <> '00000000-0000-0000-0000-00000000000b'), 0);
  for r in select * from public.sidequest_common_free('11111111-1111-1111-1111-111111111111') loop
    n := n + 1;
    perform sqtest.eq('B common length', r.ends_at - r.starts_at, interval '2 hours');
    perform sqtest.eq('B common shared_count', r.shared_count, 2);
    perform sqtest.eq('B common start', r.starts_at, date_trunc('hour', now()) + interval '27 hours');
  end loop;
  perform sqtest.eq('B common rows', n, 1);
  perform sqtest.refused('B shares into a circle they are not in',
    $s$insert into public.free_shares values ('00000000-0000-0000-0000-00000000000b', '22222222-2222-2222-2222-222222222222')$s$,
    '42501');
end $$;

select sqtest.as_user('00000000-0000-0000-0000-00000000000c');
do $$
begin
  perform sqtest.eq('C (not sharing) common after A and B share',
    (select count(*) from public.sidequest_common_free('11111111-1111-1111-1111-111111111111')), 0);
end $$;
select sqtest.as_user('00000000-0000-0000-0000-00000000000e');
do $$
begin
  perform sqtest.eq('E common', (select count(*) from public.sidequest_common_free('11111111-1111-1111-1111-111111111111')), 0);
end $$;

-- ---------- A makes it a plan; B can no longer leave; A cannot call off a plan
select sqtest.as_user('00000000-0000-0000-0000-00000000000a');
do $$
declare v uuid := current_setting('sqtest.activity')::uuid;
begin
  perform public.sidequest_close_invite(v, 'planned', '11111111-1111-1111-1111-111111111111');
  perform sqtest.eq('A status', (select status from public.activities where id = v), 'planned');
  perform sqtest.refused('A calls off a plan',
    format($s$select public.sidequest_close_invite(%L, 'called_off')$s$, v), 'P0001', 'not yours or not open');
end $$;
select sqtest.as_user('00000000-0000-0000-0000-00000000000b');
do $$
begin
  perform public.sidequest_leave_invite(current_setting('sqtest.activity')::uuid);
  perform sqtest.eq('B still in the plan after leaving', (select count(*) from public.activity_joins), 1);
end $$;
reset role;

-- A revoked member still has a signed subject but no active session.
delete from auth.sessions where user_id='00000000-0000-0000-0000-00000000000b';
set local role authenticated;
select sqtest.as_user('00000000-0000-0000-0000-00000000000b');
do $$
begin
  perform sqtest.eq('Revoked member sees no circles', (select count(*) from public.circles), 0);
  perform sqtest.eq('Revoked member sees no activities', (select count(*) from public.activities), 0);
  perform sqtest.eq('Revoked member sees no windows', (select count(*) from public.free_windows), 0);
  perform sqtest.eq('Revoked member sees no common time', (select count(*) from public.sidequest_common_free('11111111-1111-1111-1111-111111111111')), 0);
  perform sqtest.refused('Revoked member cannot join',
    format('select public.sidequest_join_invite(%L)', current_setting('sqtest.activity')), '42501');
end $$;
reset role;

-- ---------- The cap: 12 per circle, invites included
insert into auth.users(id) select ('00000000-0000-0000-0000-0000000001' || lpad(g::text, 2, '0'))::uuid from generate_series(1, 9) g;
insert into public.circle_members
  select '11111111-1111-1111-1111-111111111111', ('00000000-0000-0000-0000-0000000001' || lpad(g::text, 2, '0'))::uuid, 'invited', null, null
  from generate_series(1, 8) g;
do $$
begin
  perform sqtest.eq('circle size', (select count(*) from public.circle_members where circle_id = '11111111-1111-1111-1111-111111111111'), 12);
  perform sqtest.refused('13th circle member',
    $s$insert into public.circle_members values ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000109', 'invited', null, null)$s$,
    'P0001', 'a circle holds 12');
  perform sqtest.eq('no location columns', (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name in ('activities', 'free_windows', 'activity_joins', 'free_shares')
      and column_name ~ '(lat|lng|lon|coord|geo|position|location)'), 0);
  raise notice 'open_invites_review: all checks passed';
end $$;

rollback;
