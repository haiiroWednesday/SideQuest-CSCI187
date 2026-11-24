-- Isolated Postgres 16 CI fixture. NEVER connect to team Supabase.
-- Apply M2 events migration and the review-only schema proposal first.
begin;
insert into auth.users (id) values
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222'),
  ('33333333-3333-4333-8333-333333333333');

insert into public.events
  (id, title, host_name, description, location, event_date, start_time, end_time)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Campus concert','Music Club','Performance','SCU','2030-11-07','14:00','15:00');

do $test$
declare
  plan_id uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  event_id uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  organizer uuid := '11111111-1111-4111-8111-111111111111';
  first_member uuid := '22222222-2222-4222-8222-222222222222';
  outsider uuid := '33333333-3333-4333-8333-333333333333';
begin
  -- No direct client table access, even with permissive default grants.
  if exists (
    select 1 from unnest(array['anon','authenticated']) as roles(role_name)
    cross join unnest(array['public.group_plans','public.group_participants','public.group_invitations']) as tables(table_name)
    cross join unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) as privileges(privilege_name)
    where has_table_privilege(role_name, table_name, privilege_name)
  ) then
    raise exception 'A client role inherited direct group-table access';
  end if;
  if has_table_privilege('anon', 'public.group_plans', 'SELECT') or
     has_table_privilege('anon', 'public.group_participants', 'SELECT') or
     has_table_privilege('authenticated', 'public.group_plans', 'SELECT') or
     has_table_privilege('authenticated', 'public.group_participants', 'SELECT') or
     has_table_privilege('authenticated', 'public.group_participants', 'UPDATE') then
    raise exception 'Client role can bypass the server-filtered group view';
  end if;
  if (select count(*) from pg_policies
      where schemaname='public' and tablename in ('group_plans','group_participants','group_invitations')) <> 0 then
    raise exception 'Review-only schema must not expose client RLS policies';
  end if;
  if (select count(*) from pg_class
       where oid in ('public.group_plans'::regclass,'public.group_participants'::regclass,'public.group_invitations'::regclass)
       and relrowsecurity = true) <> 3 then
    raise exception 'All group tables must have RLS enabled';
  end if;

  insert into public.group_plans(id, event_id, organizer_id) values (plan_id,event_id,organizer);
  if (select status from public.group_plans where id=plan_id) <> 'proposed' or
     (select revision from public.group_plans where id=plan_id) <> 0 then
    raise exception 'Group plan defaults are incorrect';
  end if;
  insert into public.group_participants(plan_id,user_id) values (plan_id,first_member);
  if (select response from public.group_participants
        where group_participants.plan_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid and user_id=first_member) is not null then
    raise exception 'Absent participant response must remain unknown';
  end if;

  -- Legitimate conditional response with a private note (still no client access).
  update public.group_participants set response='if',
    private_condition='Need to finish class',responded_at=now()
    where group_participants.plan_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid and user_id=first_member;

  begin
    insert into public.group_participants(plan_id,user_id)
      values (plan_id,first_member);
    raise exception 'Duplicate membership was accepted';
  exception when unique_violation then null;
  end;

  begin
    insert into public.group_participants(plan_id,user_id,response,private_condition,responded_at)
      values (plan_id, outsider, 'works', 'should remain private', now());
    raise exception 'Nonconditional private text was accepted';
  exception when check_violation then null;
  end;

  begin
    insert into public.group_participants(plan_id,user_id,private_condition)
      values (plan_id, outsider, 'should be rejected');
    raise exception 'NULL response improperly accepted a private note';
  exception when check_violation then null;
  end;

  -- A conditional answer is valid even without a private note.
  update public.group_participants set private_condition=null
    where group_participants.plan_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid and user_id=first_member;
  if not exists (select 1 from public.group_participants
      where group_participants.plan_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid
        and user_id=first_member and response='if' and private_condition is null) then
    raise exception 'Optional private condition was not preserved';
  end if;

  begin
    insert into public.group_participants(plan_id,user_id,response,private_condition,responded_at)
      values (plan_id, outsider, 'if', repeat('x',281), now());
    raise exception 'Overlong private condition was accepted';
  exception when check_violation then null;
  end;

  begin
    insert into public.group_participants(plan_id,user_id,response)
      values (plan_id, outsider, 'works');
    raise exception 'Submitted response was accepted without timestamp';
  exception when check_violation then null;
  end;

  begin
    insert into public.group_plans(event_id,organizer_id,status)
      values (event_id,organizer,'unverified');
    raise exception 'Invalid group status was accepted';
  exception when check_violation then null;
  end;

  begin
    insert into public.group_plans(event_id,organizer_id,revision)
      values (event_id,organizer,-1);
    raise exception 'Negative revision was accepted';
  exception when check_violation then null;
  end;

  raise notice 'Group plan review-only schema constraints and deny-by-default grants passed';
end $test$;
rollback;
