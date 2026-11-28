-- Only for the disposable CI database. Roll back all fixture writes.
begin;
do $$
declare
  first_id uuid;
  again_id uuid;
  future_day date := (now() at time zone 'America/Los_Angeles')::date + 7;
  manual_id uuid;
  before_count bigint;
begin
  select count(*) into before_count from public.events;
  first_id := sidequest_intake.publish_reviewed_occurrence(
    'fixture-campus','occurrence-1','https://example.invalid/events/1',now(),
    'Fixture music night','Fixture club','Source: fixture','Fixture hall',future_day,'14:00','15:00');
  again_id := sidequest_intake.publish_reviewed_occurrence(
    'fixture-campus','occurrence-1','https://example.invalid/events/1',now(),
    'Fixture music night','Fixture club','Source: fixture','Fixture hall',future_day,'14:00','15:00');
  if first_id is null or again_id is distinct from first_id then raise exception 'Retry changed identity'; end if;
  if (select count(*) from public.events) <> before_count + 1 then raise exception 'Retry duplicated event'; end if;
  if not exists (select 1 from sidequest_intake.source_occurrences where event_id = first_id and revision = 1)
    then raise exception 'Source mapping missing'; end if;

  begin
    perform sidequest_intake.publish_reviewed_occurrence(
      'fixture-campus','occurrence-1','https://example.invalid/events/1',now(),
      'Fixture music night','Fixture club','Source: fixture','Fixture hall',future_day,'15:00','16:00');
    raise exception 'Changed occurrence was silently written';
  exception when invalid_parameter_value then null; end;
  if not exists (select 1 from public.events where id = first_id and start_time = '14:00')
    then raise exception 'Existing event was modified'; end if;

  insert into public.events(title,host_name,description,location,event_date,start_time,end_time)
    values ('Fixture manual post','Club','Manual post','Fixture room',future_day,'16:00','17:00') returning id into manual_id;
  begin
    perform sidequest_intake.publish_reviewed_occurrence(
      'fixture-campus','occurrence-2','https://example.invalid/events/2',now(),
      'Fixture manual post','Club','Imported','Fixture room',future_day,'16:00','17:00');
    raise exception 'Manual event duplicated or associated';
  exception when invalid_parameter_value then null; end;
  if not exists (select 1 from public.events where id = manual_id and description = 'Manual post')
    or exists (select 1 from sidequest_intake.source_occurrences where event_id = manual_id)
    then raise exception 'Manual post changed'; end if;

  begin
    perform sidequest_intake.publish_reviewed_occurrence(
      'fixture-campus','occurrence-3','https://example.invalid/events/3',now(),
      'Unknown end','Club','Details','Fixture room',future_day,'16:00',null);
    raise exception 'Missing end was accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform sidequest_intake.publish_reviewed_occurrence(
      'fixture-campus','occurrence-3','https://example.invalid/events/3',now() - interval '8 days',
      'Stale evidence','Club','Details','Fixture room',future_day,'16:00','17:00');
    raise exception 'Stale evidence was accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform sidequest_intake.publish_reviewed_occurrence(
      'fixture-campus','occurrence-3','https://example.invalid/events/3?token=bad',now(),
      'Unsafe URL','Club','Details','Fixture room',future_day,'16:00','17:00');
    raise exception 'Query string accepted';
  exception when invalid_parameter_value then null; end;
  if (select count(*) from public.events) <> before_count + 2 then raise exception 'Invalid requests left orphan records'; end if;
end $$;

set local role anon;
do $$
begin
  if not exists (select 1 from public.events where title = 'Fixture music night') then
    raise exception 'Public catalog cannot read imported record';
  end if;
  if has_schema_privilege(current_user,'sidequest_intake','USAGE') then raise exception 'Anonymous intake schema access'; end if;
  begin
    perform sidequest_intake.publish_reviewed_occurrence(
      'fixture-campus','unauthorized','https://example.invalid/events/4',now(),
      'Unauthorized','Club','Details','Room',(now() at time zone 'America/Los_Angeles')::date+7,'14:00','15:00');
    raise exception 'Anonymous publication was possible';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

set local role authenticated;
do $$
begin
  if has_schema_privilege(current_user,'sidequest_intake','USAGE') then raise exception 'Authenticated intake schema access'; end if;
end $$;
reset role;
rollback;
