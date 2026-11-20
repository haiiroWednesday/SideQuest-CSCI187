-- Isolated SQL review of verified-actor RPC rules. This test simulates
-- auth.uid() with a local session variable. It does NOT verify JWT signatures,
-- actual Supabase Auth lifecycle, production RLS or an outside browser.
begin;

insert into auth.users (id) values
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222'),
  ('33333333-3333-4333-8333-333333333333');

insert into public.events
  (id, title, host_name, description, location, event_date, start_time, end_time)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Campus concert','Music Club','Performance','SCU','2030-11-07','14:00','15:00');

-- The real Supabase Auth gateway supplies a signed subject. The isolated
-- fixture below models only the resulting actor ID; arbitrary SQL sessions
-- can set this variable and are NOT real authenticated requests.
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);

-- A real catalog Event is required; the organizer is derived from auth.uid().
select (public.sidequest_group_create(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
)->>'id') as plan_id \gset
select set_config('sidequest.test_plan_id', :'plan_id', false);

do $check$
declare
  v_plan uuid := current_setting('sidequest.test_plan_id')::uuid;
  v_json jsonb;
begin
  v_json := public.sidequest_group_read(v_plan);
  if v_json->>'organizerId' <> '11111111-1111-4111-8111-111111111111'
     or v_json->>'revision' <> '0'
     or jsonb_array_length(v_json->'participants') <> 0 then
    raise exception 'New group plan did not use the verified organizer and unknown member count';
  end if;
  if jsonb_array_length(public.sidequest_group_list()) <> 1 then
    raise exception 'Organizer cannot enumerate own authorized plans';
  end if;
end $check$;

select public.sidequest_group_action(
  :'plan_id'::uuid, 0, 'invite',
  '22222222-2222-4222-8222-222222222222'::uuid
);

do $check$
declare
  v_plan uuid := current_setting('sidequest.test_plan_id')::uuid;
  v_json jsonb;
begin
  v_json := public.sidequest_group_read(v_plan);
  if v_json->>'revision' <> '1'
     or v_json->'participants'->0->>'response' is not null
     or (v_json->'participants'->0 ? 'privateCondition') then
    raise exception 'Organizer should see unknown response but not other users private condition';
  end if;
  begin
    perform public.sidequest_group_action(
      v_plan, 1, 'invite',
      '22222222-2222-4222-8222-222222222222'::uuid
    );
    raise exception 'Duplicate invite was accepted';
  exception when unique_violation then null;
  end;
end $check$;

-- The invited participant sees only their own private condition.
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
select public.sidequest_group_action(
  :'plan_id'::uuid, 1, 'respond', null, 'if', 'Only after class'
);

do $check$
declare
  v_plan uuid := current_setting('sidequest.test_plan_id')::uuid;
  v_json jsonb;
begin
  v_json := public.sidequest_group_read(v_plan);
  if v_json->'participants'->0->>'privateCondition' <> 'Only after class'
    or v_json->'participants'->0->>'response' <> 'if' then
    raise exception 'Participant cannot read their own condition';
  end if;
  begin
    perform public.sidequest_group_action(v_plan, 1, 'respond', null, 'works');
    raise exception 'A stale revision was allowed to overwrite the response';
  exception when serialization_failure then null;
  end;
  begin
    perform public.sidequest_group_action(v_plan, 2, 'invite',
      '33333333-3333-4333-8333-333333333333'::uuid);
    raise exception 'Participant impersonated organizer';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.sidequest_group_action(v_plan, 2, 'respond', null, 'if', null);
    raise exception 'Missing conditional note was accepted';
  exception when invalid_parameter_value then null;
  end;
end $check$;

-- Organizer can see a conditional status, but never the note itself.
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
do $check$
declare
  v_plan uuid := current_setting('sidequest.test_plan_id')::uuid;
  v_json jsonb;
begin
  v_json := public.sidequest_group_read(v_plan);
  if v_json->'participants'->0 ? 'privateCondition' then
    raise exception 'Private condition was exposed to the organizer';
  end if;
  begin
    perform public.sidequest_group_action(v_plan, 2, 'confirm');
    raise exception 'Conditional response was incorrectly treated as approval';
  exception when invalid_parameter_value then null;
  end;
end $check$;

-- An outsider cannot read, list or change another plan; a known UUID
-- gives them no new authority.
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',false);
do $check$
declare
  v_plan uuid := current_setting('sidequest.test_plan_id')::uuid;
begin
  if jsonb_array_length(public.sidequest_group_list()) <> 0 then
    raise exception 'Outsider can list other peoples plans';
  end if;
  begin
    perform public.sidequest_group_read(v_plan);
    raise exception 'Outsider read was permitted';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.sidequest_group_action(v_plan, 2, 'respond', null, 'works');
    raise exception 'Outsider write was permitted';
  exception when insufficient_privilege then null;
  end;
end $check$;

-- Legitimate participant clears their private note when changing to Works;
-- organizer can confirm only after the response is explicitly Works.
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
select public.sidequest_group_action(:'plan_id'::uuid,2,'respond',null,'works');

select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
select public.sidequest_group_action(:'plan_id'::uuid,3,'confirm');
do $check$
declare
  v_json jsonb;
begin
  v_json := public.sidequest_group_read(current_setting('sidequest.test_plan_id')::uuid);
  if v_json->>'status' <> 'confirmed' or v_json->>'revision' <> '4' then
    raise exception 'Confirmed plan had unexpected status or revision';
  end if;
  if v_json->'participants'->0 ? 'privateCondition' then
    raise exception 'Former private condition leaked after confirmation';
  end if;
  begin
    perform public.sidequest_group_action(
      current_setting('sidequest.test_plan_id')::uuid,4,'cancel');
    raise exception 'Confirmed plan was allowed to mutate';
  exception when invalid_parameter_value then null;
  end;
end $check$;

-- Unauthenticated role has no RPC execution privileges.
reset role;
do $check$
begin
  if has_function_privilege('anon','public.sidequest_group_read(uuid)','EXECUTE') or
     has_function_privilege('anon','public.sidequest_group_create(uuid)','EXECUTE') or
     has_function_privilege('anon','public.sidequest_group_list()','EXECUTE') or
     has_function_privilege('anon','public.sidequest_group_action(uuid,bigint,text,uuid,text,text)','EXECUTE') then
    raise exception 'Anonymous caller can execute protected group RPC';
  end if;
  if not has_function_privilege('authenticated','public.sidequest_group_read(uuid)','EXECUTE') then
    raise exception 'Authenticated caller cannot execute group read RPC';
  end if;
end $check$;
rollback;
