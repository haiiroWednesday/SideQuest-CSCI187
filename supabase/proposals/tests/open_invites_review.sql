-- Behaviour check for 20261125020000_open_invites_REVIEW_ONLY.sql on a scratch database.
-- Run: fake auth schema + minimal events table, then the proposal, then this file.
-- Users: A (sender), B (member), C (member, does not share), D (invited only), E (outsider).
-- Result on PostgreSQL 16, 25 Nov 2026 (scratch database, fake auth.users and auth.uid()):
--   A sends: t; past time refused; direct insert refused; plan with nobody in refused
--   B sees 1, joins 1; D (invited only) sees 0 invites and only their own member row; D cannot join
--   E (outsider) sees 0 invites, 0 circles, 0 common time
--   C and B see 0 common time before sharing and 0 of anyone else's free windows
--   B common after both share: one 2-hour overlap, shared_count 2; sharing into a circle you are not in refused
--   A makes it a plan: planned; calling off a plan refused; 13th circle member refused; 0 location-like columns
\set ON_ERROR_STOP 0
\set A '''00000000-0000-0000-0000-00000000000a'''
\set B '''00000000-0000-0000-0000-00000000000b'''
\set C '''00000000-0000-0000-0000-00000000000c'''
\set D '''00000000-0000-0000-0000-00000000000d'''
\set E '''00000000-0000-0000-0000-00000000000e'''
insert into auth.users values (:A), (:B), (:C), (:D), (:E);
insert into public.circles (id, name, created_by) values ('11111111-1111-1111-1111-111111111111', 'Swig', :A);
insert into public.circle_members values
  ('11111111-1111-1111-1111-111111111111', :A, 'member', null, now()),
  ('11111111-1111-1111-1111-111111111111', :B, 'member', :A, now()),
  ('11111111-1111-1111-1111-111111111111', :C, 'member', :A, now()),
  ('11111111-1111-1111-1111-111111111111', :D, 'invited', :A, null);
set role authenticated;

-- A sends an invite to Swig.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
select 'A sends', public.sidequest_send_invite('Boba run', 'Benson', null, now() + interval '1 hour', now() + interval '2 hours', array['11111111-1111-1111-1111-111111111111']::uuid[]) is not null;
select 'A sends to a past time (expect error)', public.sidequest_send_invite('Late', null, null, now() - interval '2 hours', now() - interval '1 hour', array['11111111-1111-1111-1111-111111111111']::uuid[]);
insert into public.activities (title, starts_at, ends_at) values ('direct write', now(), now() + interval '1 hour');  -- expect permission error
select 'A plans with nobody in (expect error)', public.sidequest_close_invite((select id from public.activities limit 1), 'planned', '11111111-1111-1111-1111-111111111111');

-- B sees it and joins; D (invited only) and E (outsider) see nothing and cannot join.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
select 'B sees invites', count(*) from public.activities;
select public.sidequest_join_invite((select id from public.activities limit 1));
select 'B joined', count(*) from public.activity_joins;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000d', false);
select 'D (invited) sees invites', count(*) from public.activities;
select 'D sees members', count(*) from public.circle_members;
select 'D joins (expect error)', public.sidequest_join_invite('00000000-0000-0000-0000-000000000000');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000e', false);
select 'E sees invites', count(*) from public.activities;
select 'E sees circles', count(*) from public.circles;

-- Free time: A and B share, C does not. Each sees only their own rows.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
insert into public.free_shares values (:A, '11111111-1111-1111-1111-111111111111');
insert into public.free_windows (starts_at, ends_at) values (date_trunc('hour', now()) + interval '26 hours', date_trunc('hour', now()) + interval '29 hours');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);
select 'C common before sharing', count(*) from public.sidequest_common_free('11111111-1111-1111-1111-111111111111');
select 'C sees A free windows', count(*) from public.free_windows;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
select 'B common before sharing', count(*) from public.sidequest_common_free('11111111-1111-1111-1111-111111111111');
insert into public.free_shares values (:B, '11111111-1111-1111-1111-111111111111');
insert into public.free_windows (starts_at, ends_at) values (date_trunc('hour', now()) + interval '27 hours', date_trunc('hour', now()) + interval '31 hours');
select 'B sees A free windows', count(*) from public.free_windows where user_id <> :B;
select 'B common', (ends_at - starts_at) as length, shared_count from public.sidequest_common_free('11111111-1111-1111-1111-111111111111');
insert into public.free_shares values (:B, '22222222-2222-2222-2222-222222222222');  -- not a member, expect error
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000e', false);
select 'E common', count(*) from public.sidequest_common_free('11111111-1111-1111-1111-111111111111');

-- A makes it a plan; B can no longer leave it; A cannot call off a plan.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
select public.sidequest_close_invite((select id from public.activities limit 1), 'planned', '11111111-1111-1111-1111-111111111111');
select 'A status', status from public.activities;
select 'A calls off a plan (expect error)', public.sidequest_close_invite((select id from public.activities limit 1), 'called_off');
reset role;

-- The cap: 12 per circle, invites included.
insert into auth.users select ('00000000-0000-0000-0000-0000000001' || lpad(g::text, 2, '0'))::uuid from generate_series(1, 9) g;
insert into public.circle_members select '11111111-1111-1111-1111-111111111111', ('00000000-0000-0000-0000-0000000001' || lpad(g::text, 2, '0'))::uuid, 'invited', null, null from generate_series(1, 8) g;
select 'circle size', count(*) from public.circle_members;
insert into public.circle_members values ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000109', 'invited', null, null);  -- 13th, expect error
select 'no location columns', count(*) from information_schema.columns
  where table_schema = 'public' and table_name in ('activities', 'free_windows', 'activity_joins', 'free_shares')
  and column_name ~ '(lat|lng|lon|coord|geo|position|location)';
