-- REVIEW ONLY. This file is not in supabase/migrations and has not been
-- applied to SideQuest's team database.
--
-- Auth is derived solely from (select auth.uid()) inside verified PostgREST
-- requests. In isolated SQL CI auth.uid() is a fixture; it is not proof of
-- real JWT verification or session revocation. No dynamic SQL or service key.
-- All SECURITY DEFINER functions use an empty search_path and fully qualified
-- table/function references. Daven must review privileges before promotion.

create function public.sidequest_group_read(p_plan_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_plan public.group_plans%rowtype;
  v_members jsonb;
begin
  if v_actor is null then
    raise exception 'Plan unavailable' using errcode = '42501';
  end if;
  select * into v_plan from public.group_plans where id = p_plan_id;
  if not found or (
    v_plan.organizer_id <> v_actor and
    not exists (select 1 from public.group_participants
                where plan_id = p_plan_id and user_id = v_actor)
  ) then
    raise exception 'Plan unavailable' using errcode = '42501';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'userId', member.user_id,
        'response', member.response
      ) || case when member.user_id = v_actor
        then jsonb_build_object('privateCondition', member.private_condition)
        else '{}'::jsonb
      end
      order by member.user_id
    ), '[]'::jsonb
  ) into v_members
  from public.group_participants member
  where member.plan_id = p_plan_id;

  return jsonb_build_object(
    'id', v_plan.id,
    'eventId', v_plan.event_id,
    'organizerId', v_plan.organizer_id,
    'status', v_plan.status,
    'revision', v_plan.revision,
    'participants', v_members
  );
end;
$$;

create function public.sidequest_group_create(p_event_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_id uuid;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if not exists (select 1 from public.events where id = p_event_id) then
    raise exception 'Event unavailable' using errcode = '22023';
  end if;
  insert into public.group_plans(event_id, organizer_id)
    values (p_event_id, v_actor)
    returning id into v_id;
  return public.sidequest_group_read(v_id);
end;
$$;

create function public.sidequest_group_list()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_result jsonb;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  select coalesce(
    jsonb_agg(jsonb_build_object(
      'id', plan.id,
      'eventId', plan.event_id,
      'organizerId', plan.organizer_id,
      'status', plan.status,
      'revision', plan.revision
    ) order by plan.created_at desc, plan.id),
    '[]'::jsonb
  ) into v_result
  from public.group_plans plan
  where plan.organizer_id = v_actor
     or exists (select 1 from public.group_participants member
                where member.plan_id = plan.id and member.user_id = v_actor);
  return v_result;
end;
$$;

create function public.sidequest_group_action(
  p_plan_id uuid,
  p_expected_revision bigint,
  p_action text,
  p_invitee_id uuid default null,
  p_response text default null,
  p_condition text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_plan public.group_plans%rowtype;
  v_condition text;
begin
  if v_actor is null then
    raise exception 'Plan unavailable' using errcode = '42501';
  end if;

  -- Lock the parent plan for the entire transaction. All permitted mutations
  -- take this lock; stale parallel writes then fail on their revision.
  select * into v_plan from public.group_plans
    where id = p_plan_id for update;
  if not found or (
    v_plan.organizer_id <> v_actor and
    not exists (select 1 from public.group_participants
                where plan_id = p_plan_id and user_id = v_actor)
  ) then
    raise exception 'Plan unavailable' using errcode = '42501';
  end if;
  if p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'Valid revision required' using errcode = '22023';
  end if;
  if v_plan.revision <> p_expected_revision then
    raise exception 'Stale plan revision' using errcode = '40001';
  end if;
  if v_plan.status <> 'proposed' then
    raise exception 'Plan no longer accepts changes' using errcode = '22023';
  end if;

  if p_action = 'respond' then
    if not exists (select 1 from public.group_participants
                   where plan_id = p_plan_id and user_id = v_actor) then
      raise exception 'Only participants may respond' using errcode = '42501';
    end if;
    if p_response is null or p_response not in ('works','if','cant') then
      raise exception 'Invalid response' using errcode = '22023';
    end if;
    v_condition := nullif(btrim(p_condition), '');
    if p_response = 'if' then
      if v_condition is null or char_length(v_condition) > 280 then
        raise exception 'If response needs a condition of up to 280 characters' using errcode = '22023';
      end if;
    elsif p_condition is not null then
      raise exception 'Only If may include a private condition' using errcode = '22023';
    end if;
    update public.group_participants
      set response = p_response,
          private_condition = case when p_response='if' then v_condition else null end,
          responded_at = now()
      where plan_id = p_plan_id and user_id = v_actor;

  else
    if v_plan.organizer_id <> v_actor then
      raise exception 'Organizer permission required' using errcode = '42501';
    end if;

    if p_action = 'invite' then
      if p_invitee_id is null or p_invitee_id = v_actor then
        raise exception 'Invite another verified account' using errcode = '22023';
      end if;
      if (select count(*) from public.group_participants where plan_id = p_plan_id) >= 11 then
        raise exception 'Participant limit reached' using errcode = '22023';
      end if;
      if exists (select 1 from public.group_participants
                 where plan_id = p_plan_id and user_id = p_invitee_id) then
        raise exception 'Already invited' using errcode = '23505';
      end if;
      insert into public.group_participants(plan_id,user_id)
        values (p_plan_id,p_invitee_id);

    elsif p_action = 'remove' then
      if p_invitee_id is null then
        raise exception 'Select a participant to remove' using errcode = '22023';
      end if;
      delete from public.group_participants
        where plan_id = p_plan_id and user_id = p_invitee_id;
      if not found then
        raise exception 'Participant not found' using errcode = '22023';
      end if;

    elsif p_action = 'confirm' then
      if not exists (select 1 from public.group_participants
                     where plan_id = p_plan_id) or
         exists (select 1 from public.group_participants
                 where plan_id = p_plan_id
                   and response is distinct from 'works') then
        raise exception 'All participants must explicitly answer Works' using errcode = '22023';
      end if;
      update public.group_plans
        set status='confirmed' where id = p_plan_id;

    elsif p_action = 'cancel' then
      update public.group_plans
        set status='cancelled' where id = p_plan_id;

    else
      raise exception 'Unsupported group action' using errcode = '22023';
    end if;
  end if;

  update public.group_plans
    set revision = revision + 1, updated_at = now()
    where id = p_plan_id;
  return public.sidequest_group_read(p_plan_id);
end;
$$;

-- PostgreSQL grants EXECUTE on new functions to PUBLIC by default. Remove it
-- before exposing only authenticated callers, even if PostgREST routes are
-- available. A bearer token requires actual verification by Supabase Auth.
revoke all on function public.sidequest_group_read(uuid) from public, anon;
revoke all on function public.sidequest_group_create(uuid) from public, anon;
revoke all on function public.sidequest_group_list() from public, anon;
revoke all on function public.sidequest_group_action(uuid,bigint,text,uuid,text,text) from public, anon;
grant execute on function public.sidequest_group_read(uuid) to authenticated;
grant execute on function public.sidequest_group_create(uuid) to authenticated;
grant execute on function public.sidequest_group_list() to authenticated;
grant execute on function public.sidequest_group_action(uuid,bigint,text,uuid,text,text) to authenticated;
