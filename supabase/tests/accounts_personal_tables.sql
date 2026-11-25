-- Behavior check for 20261124000000_accounts_personal_tables_REVIEW_ONLY.sql. Run on a scratch database with a fake auth schema.
-- Expected: 100 plans then one RLS refusal; ready idea without event refused; 90-character title refused;
-- valid signed-in post accepted; user B sees 0 of user A's plans and ideas and cannot change them.
\set ON_ERROR_STOP 0
insert into auth.users values ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b');
insert into public.events (title, host_name, description, location, event_date, start_time, end_time)
select 'E'||g, 'Host', 'Talk', 'Swig', (now() at time zone 'America/Los_Angeles')::date + 1, '10:00', '11:00' from generate_series(1,101) g;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a', false);
insert into public.my_plans (event_id) select id from public.events order by title limit 100;
select 'A plans', count(*) from public.my_plans;
insert into public.my_plans (event_id) select id from public.events order by title desc limit 1;  -- 101st, expect error
insert into public.someday_ideas (title, status) values ('Boba', 'ready');  -- expect check error
insert into public.someday_ideas (title) values ('Boba run');
insert into public.events (title, host_name, description, location, event_date, start_time, end_time)
  values (repeat('x', 90), 'Me', 'Talk', 'Swig', (now() at time zone 'America/Los_Angeles')::date + 1, '10:00', '11:00');  -- too long, expect RLS error
insert into public.events (title, host_name, description, location, event_date, start_time, end_time)
  values ('Signed-in post', 'Me', 'Talk', 'Swig', (now() at time zone 'America/Los_Angeles')::date + 1, '10:00', '11:00');
select 'A sees events', count(*) from public.events;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000b', false);
select 'B sees A plans', count(*) from public.my_plans;
select 'B sees A ideas', count(*) from public.someday_ideas;
update public.someday_ideas set title = 'stolen';
select 'B profiles', count(*) from public.profiles;
reset role;
select 'idea title still', title from public.someday_ideas;
