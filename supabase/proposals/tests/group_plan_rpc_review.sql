-- Isolated SQL acceptance with simulated Auth claims. No live database.
begin;
insert into auth.users (id,email,email_confirmed_at) values
  ('11111111-1111-4111-8111-111111111111','organizer@scu.edu',now()),
  ('22222222-2222-4222-8222-222222222222','member@alumni.scu.edu',now()),
  ('33333333-3333-4333-8333-333333333333','bo@scu.edu',now()),
  ('44444444-4444-4444-8444-444444444444','outsider@scu.edu',now()),
  ('55555555-5555-4555-8555-555555555555','person@not-scu.edu',now()),
  ('66666666-6666-4666-8666-666666666666','unverified@scu.edu',null);
insert into public.events
  (id, title, host_name, description, location, event_date, start_time, end_time)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Campus concert','Music Club','Performance','SCU','2030-11-07','14:00','15:00');

set role authenticated;
do $check$
declare
  organizer uuid := '11111111-1111-4111-8111-111111111111';
  amy uuid := '22222222-2222-4222-8222-222222222222';
  bo uuid := '33333333-3333-4333-8333-333333333333';
  outsider uuid := '44444444-4444-4444-8444-444444444444';
  absent_account uuid := 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  event_id uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  plan_id uuid;
  cap_plan uuid;
  v jsonb;
  i int;
begin
  -- Direct RPC callers cannot bypass the verified school address rule.
  foreach v in array array[to_jsonb('55555555-5555-4555-8555-555555555555'::text),to_jsonb('66666666-6666-4666-8666-666666666666'::text)] loop
    perform set_config('request.jwt.claim.sub', v #>> '{}', true);
    begin
      perform public.sidequest_group_create(event_id);
      raise exception 'Ineligible email could create a group';
    exception when insufficient_privilege then null;
    end;
    begin
      perform public.sidequest_group_list();
      raise exception 'Ineligible email could list groups';
    exception when insufficient_privilege then null;
    end;
  end loop;
  perform set_config('request.jwt.claim.sub', organizer::text, true);
  v := public.sidequest_group_create(event_id);
  plan_id := (v->>'id')::uuid;
  if v->>'organizerId' <> organizer::text or v->>'revision' <> '0'
     or v->'participants' <> '[]'::jsonb or v->'invitations' <> '[]'::jsonb then
    raise exception 'Invalid initial plan';
  end if;
  if jsonb_array_length(public.sidequest_group_list()) <> 1 then raise exception 'Missing own plan'; end if;

  -- A real and a nonexistent account UUID follow identical invitation semantics.
  v := public.sidequest_group_action(plan_id,0,'invite',amy);
  if v->'participants' <> '[]'::jsonb or v->'invitations' <> jsonb_build_array(amy) then
    raise exception 'Invitation incorrectly created membership';
  end if;
  v := public.sidequest_group_action(plan_id,1,'invite',absent_account);
  if v->'participants' <> '[]'::jsonb or jsonb_array_length(v->'invitations') <> 2 then
    raise exception 'Nonexistent account has distinguishable invitation behavior';
  end if;
  begin
    perform public.sidequest_group_action(plan_id,2,'invite',amy);
    raise exception 'Duplicate invitation was accepted';
  exception when unique_violation then null;
  end;
  v := public.sidequest_group_action(plan_id,2,'remove',absent_account);
  v := public.sidequest_group_action(plan_id,3,'invite',bo);

  -- Pending invitees get only their own invitation; no roster or implicit consent.
  perform set_config('request.jwt.claim.sub',amy::text,true);
  v := public.sidequest_group_read(plan_id);
  if v->'participants' <> '[]'::jsonb or v->'invitations' <> jsonb_build_array(amy) then
    raise exception 'Pending invitee received private roster or other invitations';
  end if;
  begin
    perform public.sidequest_group_action(plan_id,4,'respond',null,'works');
    raise exception 'Unaccepted invitee could respond';
  exception when insufficient_privilege then null;
  end;
  v := public.sidequest_group_action(plan_id,4,'accept');
  if jsonb_array_length(v->'participants') <> 1 or v->'participants'->0->>'response' is not null then
    raise exception 'Acceptance must not imply attendance';
  end if;
  v := public.sidequest_group_action(plan_id,5,'respond',null,'if',repeat('😀',280));
  if v->'participants'->0->>'ifCondition' <> repeat('😀',280) then
    raise exception '280 code points should be valid';
  end if;
  begin
    perform public.sidequest_group_action(plan_id,6,'respond',null,'if',repeat('😀',281));
    raise exception '281 code points were accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.sidequest_group_action(plan_id,5,'respond',null,'works');
    raise exception 'Stale response accepted';
  exception when serialization_failure then null;
  end;
  begin
    perform public.sidequest_group_action(plan_id,6,'invite',outsider);
    raise exception 'Participant impersonated organizer';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.sidequest_group_action(plan_id,6,'respond',null,'works','private text');
    raise exception 'A note on a non-If answer was accepted';
  exception when invalid_parameter_value then null;
  end;

  -- A second pending recipient sees no roster and no notes. After accepting, the other
  -- member's If note is shared with them (team decision, Nov 24: notes are how the group talks).
  perform set_config('request.jwt.claim.sub',bo::text,true);
  v := public.sidequest_group_read(plan_id);
  if v->'participants' <> '[]'::jsonb then raise exception 'Pending roster or note leak'; end if;
  v := public.sidequest_group_action(plan_id,6,'accept');
  if not exists (select 1 from jsonb_array_elements(v->'participants') member
             where member->>'userId'=amy::text and member->>'ifCondition'=repeat('😀',280)) then
    raise exception 'Accepted member cannot read the group If note';
  end if;
  v := public.sidequest_group_action(plan_id,7,'respond',null,'if');
  if not exists (select 1 from jsonb_array_elements(v->'participants') member
    where member->>'userId'=bo::text and member->>'response'='if'
      and member->'ifCondition'='null'::jsonb) then
    raise exception 'If without a note was not saved';
  end if;

  perform set_config('request.jwt.claim.sub',organizer::text,true);
  v := public.sidequest_group_read(plan_id);
  if not exists (select 1 from jsonb_array_elements(v->'participants') member
                 where member->>'userId'=amy::text and member->>'ifCondition'=repeat('😀',280)) then
    raise exception 'Organizer cannot read the group If note';
  end if;
  -- Only an If answer carries a note.
  if exists (select 1 from jsonb_array_elements(v->'participants') member
             where member->>'response' is distinct from 'if' and member->>'ifCondition' is not null) then
    raise exception 'A non-If answer carried a note';
  end if;
  begin
    perform public.sidequest_group_action(plan_id,8,'confirm');
    raise exception 'Conditional response incorrectly confirmed';
  exception when invalid_parameter_value then null;
  end;
  v := public.sidequest_group_action(plan_id,8,'invite',outsider);

  -- Decline is successful without returning any plan details.
  perform set_config('request.jwt.claim.sub',outsider::text,true);
  if public.sidequest_group_action(plan_id,9,'decline') is not null then
    raise exception 'Decline leaked a plan projection';
  end if;
  if jsonb_array_length(public.sidequest_group_list()) <> 0 then raise exception 'Declined plan listed'; end if;
  begin
    perform public.sidequest_group_read(plan_id);
    raise exception 'Declined/outsider plan read';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.sidequest_group_action(plan_id,10,'respond',null,'works');
    raise exception 'Declined/outsider plan write';
  exception when insufficient_privilege then null;
  end;

  -- Organizer revokes a member; that account loses all access.
  perform set_config('request.jwt.claim.sub',organizer::text,true);
  v := public.sidequest_group_action(plan_id,10,'remove',bo);
  if v->>'revision' <> '11' then raise exception 'Removal revision incorrect'; end if;
  perform set_config('request.jwt.claim.sub',bo::text,true);
  begin
    perform public.sidequest_group_read(plan_id);
    raise exception 'Removed member still has access';
  exception when insufficient_privilege then null;
  end;

  perform set_config('request.jwt.claim.sub',amy::text,true);
  v := public.sidequest_group_action(plan_id,11,'respond',null,'works');
  -- Changing away from If drops the note.
  if exists (select 1 from jsonb_array_elements(v->'participants') member where member->>'userId'=amy::text and member->>'ifCondition' is not null) then
    raise exception 'Note survived a change away from If';
  end if;
  perform set_config('request.jwt.claim.sub',organizer::text,true);
  v := public.sidequest_group_action(plan_id,12,'confirm');
  if v->>'status' <> 'confirmed' then raise exception 'Expected confirmation'; end if;
  perform set_config('request.jwt.claim.sub',amy::text,true);
  if public.sidequest_group_action(plan_id,13,'leave') is not null then raise exception 'Leave leaked plan'; end if;
  perform set_config('request.jwt.claim.sub',organizer::text,true);
  v := public.sidequest_group_read(plan_id);
  if v->>'status' <> 'cancelled' or v->>'revision' <> '14' then raise exception 'Leave failed to invalidate confirmation'; end if;
  -- Leaving removes the member's row, and with it any note.
  if exists (select 1 from jsonb_array_elements(v->'participants') member where member->>'userId'=amy::text) then
    raise exception 'Leaving kept the member and their note';
  end if;

  -- Bound pending + accepted slots; use arbitrary UUIDs, without account lookup.
  cap_plan := (public.sidequest_group_create(event_id)->>'id')::uuid;
  for i in 0..10 loop
    perform public.sidequest_group_action(cap_plan,i,'invite',md5('capacity-' || i)::uuid);
  end loop;
  begin
    perform public.sidequest_group_action(cap_plan,11,'invite',md5('capacity-over')::uuid);
    raise exception '12th invitee (13th person) was accepted';
  exception when invalid_parameter_value then null;
  end;
  v := public.sidequest_group_action(cap_plan,11,'cancel');
  if v->>'status' <> 'cancelled' or v->'invitations' <> '[]'::jsonb then raise exception 'Cancellation did not clear invitations'; end if;

  -- Exercise actual null-actor and anonymous-account denial paths.
  perform set_config('request.jwt.claim.sub','',true);
  begin
    perform public.sidequest_group_list();
    raise exception 'Missing actor not denied';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claim.sub',organizer::text,true);
  perform set_config('request.jwt.claim.is_anonymous','true',true);
  begin
    perform public.sidequest_group_read(plan_id);
    raise exception 'Anonymous Supabase session not denied';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claim.is_anonymous','false',true);

  -- An existing session alone cannot authorize an expired or invalid JWT.
  -- All four private RPC entry points must deny access, even for the organizer.
  foreach i in array array[0,1,2,3] loop
    perform set_config('request.jwt.claim.exp',
      case i when 0 then '1' when 1 then 'null'
        when 2 then '"not-a-number"' else '"4102444800"' end, true);
    begin
      perform public.sidequest_group_list();
      raise exception 'Invalid expiry allowed list';
    exception when insufficient_privilege then null;
    end;
    begin
      perform public.sidequest_group_read(plan_id);
      raise exception 'Invalid expiry allowed read';
    exception when insufficient_privilege then null;
    end;
    begin
      perform public.sidequest_group_create(event_id);
      raise exception 'Invalid expiry allowed create';
    exception when insufficient_privilege then null;
    end;
    begin
      perform public.sidequest_group_action(cap_plan,12,'cancel');
      raise exception 'Invalid expiry allowed mutation';
    exception when insufficient_privilege then null;
    end;
  end loop;
  perform set_config('request.jwt.claim.exp','',true);
  if jsonb_array_length(public.sidequest_group_list()) <> 2 then
    raise exception 'Valid session failed after resetting expiry fixture';
  end if;

  -- Reserve a confirmed plan for testing Auth-account removal by FK cascade.
  v := public.sidequest_group_create(event_id);
  plan_id := (v->>'id')::uuid;
  perform public.sidequest_group_action(plan_id,0,'invite',amy);
  perform set_config('request.jwt.claim.sub',amy::text,true);
  perform public.sidequest_group_action(plan_id,1,'accept');
  perform public.sidequest_group_action(plan_id,2,'respond',null,'works');
  perform set_config('request.jwt.claim.sub',organizer::text,true);
  perform public.sidequest_group_action(plan_id,3,'confirm');
  perform set_config('sidequest.test_delete_plan_id',plan_id::text,true);

  -- A separate plan must still have an accepted member and a pending
  -- invitation when its organizer is deleted. The public event survives.
  v := public.sidequest_group_create(event_id);
  plan_id := (v->>'id')::uuid;
  perform public.sidequest_group_action(plan_id,0,'invite',bo);
  perform set_config('request.jwt.claim.sub',bo::text,true);
  perform public.sidequest_group_action(plan_id,1,'accept');
  perform public.sidequest_group_action(plan_id,2,'respond',null,'if','Shared note');
  perform set_config('request.jwt.claim.sub',organizer::text,true);
  v := public.sidequest_group_action(plan_id,3,'invite',outsider);
  if jsonb_array_length(v->'participants') <> 1
     or jsonb_array_length(v->'invitations') <> 1 then
    raise exception 'Organizer deletion fixture lacks a member or pending invitation';
  end if;
  perform set_config('sidequest.test_organizer_delete_plan_id',plan_id::text,true);
end $check$;

reset role;
do $check$
declare
  p uuid := current_setting('sidequest.test_delete_plan_id')::uuid;
  owned_plan uuid := current_setting('sidequest.test_organizer_delete_plan_id')::uuid;
begin
  delete from auth.users where id='22222222-2222-4222-8222-222222222222';
  if exists(select 1 from public.group_participants where plan_id=p) then
    raise exception 'Account deletion retained accepted membership';
  end if;
  if (select status from public.group_plans where id=p) <> 'cancelled'
     or (select revision from public.group_plans where id=p) <> 5 then
    raise exception 'Account deletion retained invalid confirmation or revision';
  end if;
  if not exists(select 1 from public.group_participants where plan_id=owned_plan)
     or not exists(select 1 from public.group_invitations where plan_id=owned_plan) then
    raise exception 'Organizer deletion fixture lost its dependent rows';
  end if;
  delete from auth.users where id='11111111-1111-4111-8111-111111111111';
  if exists(select 1 from public.group_plans where id in (p,owned_plan))
     or exists(select 1 from public.group_participants where plan_id=owned_plan)
     or exists(select 1 from public.group_invitations where plan_id=owned_plan) then
    raise exception 'Organizer deletion retained plan or dependent rows';
  end if;
  if not exists(select 1 from public.events where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
     or not exists(select 1 from auth.users where id='33333333-3333-4333-8333-333333333333')
     or not exists(select 1 from auth.users where id='44444444-4444-4444-8444-444444444444') then
    raise exception 'Organizer deletion removed the public event or another account';
  end if;
  if exists (
    select 1 from pg_proc proc join pg_namespace ns on ns.oid=proc.pronamespace
    where ns.nspname='public' and proc.proname like 'sidequest_group_%'
      and pg_get_userbyid(proc.proowner) <> 'postgres'
  ) then raise exception 'Unexpected SECURITY DEFINER owner'; end if;
end $check$;

-- Real SQL invocation, not only a privilege metadata assertion.
set role anon;
do $check$
begin
  perform set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
  begin
    perform public.sidequest_group_list();
    raise exception 'Anonymous role executed protected RPC';
  exception when insufficient_privilege then null;
  end;
  begin
    perform * from public.group_invitations;
    raise exception 'Anonymous role read private invitations';
  exception when insufficient_privilege then null;
  end;
end $check$;
reset role;
rollback;
