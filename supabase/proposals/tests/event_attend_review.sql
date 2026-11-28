-- Run after supabase/proposals/20261126000000_event_attend_REVIEW_ONLY.sql in an isolated PostgreSQL
-- database as its owner. Every test write is rolled back.
-- Checks: the column is nullable text holding only 'set' or 'dropin'; rows from before it keep
-- NULL and stay readable; an anonymous post may leave it out or set either value, and nothing else.
begin;
-- An event posted before the column existed (owner insert, no policy), with NULL in it.
insert into public.events (title,host_name,description,location,event_date,start_time,end_time)
values ('Old post', 'Club', 'Details', 'Room', (now() at time zone 'America/Los_Angeles')::date + 3, '10:00', '11:00');

do $$
declare
  col record;
  described text;
begin
  select data_type, is_nullable, column_default into col from information_schema.columns
   where table_schema = 'public' and table_name = 'events' and column_name = 'attend';
  if not found then raise exception 'public.events.attend does not exist'; end if;
  if col.data_type <> 'text' then raise exception 'attend should be text, is %', col.data_type; end if;
  if col.is_nullable <> 'YES' then raise exception 'attend must be nullable so older events stay valid'; end if;
  if col.column_default is not null then raise exception 'attend must have no default: NULL means a set-time event'; end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.events'::regclass and conname = 'events_attend_known' and contype = 'c') then
    raise exception 'the events_attend_known check constraint is missing';
  end if;
  select col_description('public.events'::regclass, attnum) into described from pg_attribute
   where attrelid = 'public.events'::regclass and attname = 'attend';
  if described is null or described not like '%dropin%' then raise exception 'attend has no comment explaining it'; end if;
end $$;

set local role anon;
do $$
declare
  test record;
  campus_week date := (now() at time zone 'America/Los_Angeles')::date + 7;
  stored boolean;
  old_rows int;
  kept text;
begin
  select count(*) into old_rows from public.events where title = 'Old post' and attend is null;
  if old_rows <> 1 then raise exception 'older event without attend is not readable, or was backfilled'; end if;

  for test in select * from (values
    ('left out',            'omit',     true),
    ('null',                null,       true),
    ('drop in',             'dropin',   true),
    ('set time',            'set',      true),
    ('hyphenated',          'drop-in',  false),
    ('capitals',            'DROPIN',   false),
    ('empty text',          '',         false),
    ('another word',        'fair',     false),
    ('padded',              ' dropin',  false)
  ) as cases(label, attend, accepted) loop
    begin
      if test.attend = 'omit' then
        insert into public.events (title,host_name,description,location,event_date,start_time,end_time)
        values ('Fixture ' || test.label, 'Club', 'Details', 'Room', campus_week, '11:00', '15:00');
      else
        insert into public.events (title,host_name,description,location,event_date,start_time,end_time,attend)
        values ('Fixture ' || test.label, 'Club', 'Details', 'Room', campus_week, '11:00', '15:00', test.attend);
      end if;
      stored := true;
    exception when check_violation or insufficient_privilege then
      stored := false;
    end;
    if stored <> test.accepted then
      raise exception 'case "%": expected accepted=%, got %', test.label, test.accepted, stored;
    end if;
  end loop;

  -- What was stored is what is read back, and leaving it out stores NULL, never a guess.
  select attend into kept from public.events where title = 'Fixture drop in';
  if kept is distinct from 'dropin' then raise exception 'a drop-in post read back as %', kept; end if;
  select attend into kept from public.events where title = 'Fixture left out';
  if kept is not null then raise exception 'a post without attend read back as %, expected NULL', kept; end if;
end $$;
rollback;
