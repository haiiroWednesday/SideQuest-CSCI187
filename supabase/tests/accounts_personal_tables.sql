-- Behaviour test for supabase/proposals/20261124000000_accounts_personal_tables_REVIEW_ONLY.sql
-- (live in Supabase). Run on a scratch database as its owner, after every migration, the accounts
-- SQL and supabase/tests/fixture/auth_stub.sql: `bash supabase/tests/run-all.sh` does all of that.
-- Every check raises an exception, so psql stops with a non-zero exit on the first broken rule.
-- Everything runs in one transaction and is rolled back.
--   * user B cannot read, change or delete user A's my_plans, someday_ideas, busy_times or profiles,
--     and cannot write rows in A's name; anon cannot read any of them
--   * the 101st plan and the 101st Someday idea are refused; B's own limit is separate from A's
--   * a 'ready' or 'proposed' Someday idea needs an event, on insert and on update
--   * a signed-in post passes the same checks as an anonymous one
\set ON_ERROR_STOP 1
begin;

\ir fixture/sqtest.sql

insert into auth.users values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b');
-- 101 events for the limit check, posted by the owner.
insert into public.events (title, host_name, description, location, event_date, start_time, end_time)
select 'Event ' || lpad(g::text, 3, '0'), 'Host', 'Talk', 'Swig',
       (now() at time zone 'America/Los_Angeles')::date + 1, '10:00', '11:00'
from generate_series(1, 101) g;

set local role authenticated;

-- ---------- A fills their own tables
select sqtest.as_user('00000000-0000-0000-0000-00000000000a');
do $$
declare a uuid := '00000000-0000-0000-0000-00000000000a'; ev uuid; idea uuid;
begin
  select id into ev from public.events where title = 'Event 001';

  -- Limit: 100 plans, then the 101st is refused by the insert policy.
  insert into public.my_plans (event_id) select id from public.events where title <> 'Event 101';
  perform sqtest.eq('A has 100 plans', (select count(*) from public.my_plans), 100);
  perform sqtest.refused('101st plan',
    $s$insert into public.my_plans (event_id) select id from public.events where title = 'Event 101'$s$, '42501');

  -- Ready and proposed ideas need a real event.
  perform sqtest.refused('ready idea without event',
    $s$insert into public.someday_ideas (title, status) values ('Boba', 'ready')$s$, '23514');
  perform sqtest.refused('proposed idea without event',
    $s$insert into public.someday_ideas (title, status) values ('Boba', 'proposed')$s$, '23514');
  insert into public.someday_ideas (title, status, event_id) values ('Boba with event', 'ready', ev);
  insert into public.someday_ideas (title) values ('Boba run') returning id into idea;
  perform sqtest.refused('idea updated to ready without event',
    format('update public.someday_ideas set status = %L where id = %L', 'ready', idea), '23514');
  perform sqtest.refused('ready idea loses its event',
    format('update public.someday_ideas set event_id = null where title = %L', 'Boba with event'), '23514');

  -- Limit: 100 ideas, then the 101st is refused.
  insert into public.someday_ideas (title) select 'Idea ' || g from generate_series(1, 98) g;
  perform sqtest.eq('A has 100 ideas', (select count(*) from public.someday_ideas), 100);
  perform sqtest.refused('101st idea',
    $s$insert into public.someday_ideas (title) values ('One too many')$s$, '42501');

  insert into public.busy_times (busy_date, start_time, end_time) values (current_date + 1, '09:00', '10:00');
  insert into public.profiles (id, display_name) values (a, 'A');
  perform sqtest.eq('A sees own busy time', (select count(*) from public.busy_times), 1);
  perform sqtest.eq('A sees own profile', (select count(*) from public.profiles), 1);

  -- Signed-in posts use the same rules as anonymous ones.
  insert into public.events (title, host_name, description, location, event_date, start_time, end_time)
    values ('Signed-in post', 'Me', 'Talk', 'Swig', (now() at time zone 'America/Los_Angeles')::date + 1, '10:00', '11:00');
  perform sqtest.refused('signed-in post with a 90-character title',
    format($s$insert into public.events (title, host_name, description, location, event_date, start_time, end_time)
              values (%L, 'Me', 'Talk', 'Swig', (now() at time zone 'America/Los_Angeles')::date + 1, '10:00', '11:00')$s$,
           repeat('x', 90)), '42501');
end $$;

-- ---------- B cannot see, change, delete or write as A
select sqtest.as_user('00000000-0000-0000-0000-00000000000b');
do $$
declare a uuid := '00000000-0000-0000-0000-00000000000a'; ev uuid;
begin
  select id into ev from public.events where title = 'Event 101';

  -- Read
  perform sqtest.eq('B sees A plans', (select count(*) from public.my_plans), 0);
  perform sqtest.eq('B sees A ideas', (select count(*) from public.someday_ideas), 0);
  perform sqtest.eq('B sees A busy time', (select count(*) from public.busy_times), 0);
  perform sqtest.eq('B sees A profile', (select count(*) from public.profiles), 0);

  -- Update. No WHERE clause on purpose: with a WHERE, PostgreSQL also applies the SELECT
  -- policy, which would hide a too-loose UPDATE policy.
  perform sqtest.eq('B updates A ideas', sqtest.touched($s$update public.someday_ideas set title = 'stolen'$s$), 0);
  perform sqtest.eq('B updates A profile', sqtest.touched($s$update public.profiles set display_name = 'stolen'$s$), 0);
  -- my_plans and busy_times have no UPDATE grant at all.
  perform sqtest.refused('B updates A plans', $s$update public.my_plans set created_at = now()$s$, '42501');
  perform sqtest.refused('B updates A busy time', $s$update public.busy_times set busy_date = current_date$s$, '42501');

  -- Delete (no WHERE, same reason)
  perform sqtest.eq('B deletes A plans', sqtest.touched('delete from public.my_plans'), 0);
  perform sqtest.eq('B deletes A ideas', sqtest.touched('delete from public.someday_ideas'), 0);
  perform sqtest.eq('B deletes A busy time', sqtest.touched('delete from public.busy_times'), 0);
  perform sqtest.refused('B deletes A profile', 'delete from public.profiles', '42501');

  -- Write rows in A's name
  perform sqtest.refused('B adds a plan for A',
    format('insert into public.my_plans (user_id, event_id) values (%L, %L)', a, ev), '42501');
  perform sqtest.refused('B adds an idea for A',
    format($s$insert into public.someday_ideas (user_id, title) values (%L, 'planted')$s$, a), '42501');
  perform sqtest.refused('B adds busy time for A',
    format($s$insert into public.busy_times (user_id, busy_date, start_time, end_time) values (%L, current_date + 1, '11:00', '12:00')$s$, a), '42501');
  perform sqtest.refused('B creates A profile row',
    format($s$insert into public.profiles (id, display_name) values (%L, 'B')$s$, a), '42501');

  -- B's limit counts B's rows only: A's 100 plans do not block B.
  insert into public.my_plans (event_id) values (ev);
  insert into public.someday_ideas (title) values ('B idea');
  perform sqtest.eq('B sees only own plan', (select count(*) from public.my_plans), 1);
  perform sqtest.eq('B sees only own idea', (select count(*) from public.someday_ideas), 1);
  -- Both can still read the public catalog.
  perform sqtest.eq('B reads events', (select count(*) from public.events), 102);
end $$;

-- ---------- anon reads nothing personal
reset role;
set local role anon;
do $$
begin
  perform sqtest.refused('anon reads plans', 'select count(*) from public.my_plans', '42501');
  perform sqtest.refused('anon reads ideas', 'select count(*) from public.someday_ideas', '42501');
  perform sqtest.refused('anon reads busy time', 'select count(*) from public.busy_times', '42501');
  perform sqtest.refused('anon reads profiles', 'select count(*) from public.profiles', '42501');
end $$;

-- ---------- A's rows are untouched (checked as the owner, who bypasses RLS)
reset role;
do $$
declare a uuid := '00000000-0000-0000-0000-00000000000a';
begin
  perform sqtest.eq('A plans kept', (select count(*) from public.my_plans where user_id = a), 100);
  perform sqtest.eq('A ideas kept', (select count(*) from public.someday_ideas where user_id = a), 100);
  perform sqtest.eq('A ideas renamed', (select count(*) from public.someday_ideas where title = 'stolen'), 0);
  perform sqtest.eq('A busy time kept', (select count(*) from public.busy_times where user_id = a), 1);
  perform sqtest.eq('A profile renamed', (select count(*) from public.profiles where display_name <> 'A'), 0);
  perform sqtest.eq('rows written as A by B',
    (select count(*) from public.someday_ideas where title = 'planted'), 0);
  raise notice 'accounts_personal_tables: all checks passed';
end $$;

rollback;
