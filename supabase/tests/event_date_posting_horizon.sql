-- Run after 20261110000000_event_date_posting_horizon.sql in an isolated
-- PostgreSQL database as its owner. Test owner: Daven.
-- Every test write is rolled back; this does not provision or alter live roles.
begin;
-- now() cannot be faked here, so the Feb 29 rule is checked on the policy's
-- own expression form; the Model's Feb 29 behavior is in catalog.date-cap.test.ts.
do $$
begin
  if (date '2028-02-29' + interval '1 year')::date <> date '2029-02-28' then raise exception 'Feb 29 must clamp to Feb 28, matching latestPostingDate()'; end if;
end $$;
set local role anon;
do $$
declare
  campus_today date := (now() at time zone 'America/Los_Angeles')::date;
  latest date := ((now() at time zone 'America/Los_Angeles')::date + interval '1 year')::date;
begin
  insert into public.events (title,host_name,description,location,event_date,start_time,end_time)
  values ('Horizon fixture today','Fixture club','Test record rolled back','Fixture room',campus_today,'23:00','23:30');
  insert into public.events (title,host_name,description,location,event_date,start_time,end_time)
  values ('Horizon fixture last day','Fixture club','Test record rolled back','Fixture room',latest,'14:30','15:30');
  if (select count(*) from public.events where title in ('Horizon fixture today','Horizon fixture last day')) <> 2 then
    raise exception 'Today and today + 1 year must both be accepted';
  end if;
  begin
    insert into public.events (title,host_name,description,location,event_date,start_time,end_time)
    values ('Invalid yesterday','Club','Details','Room',campus_today - 1,'14:30','15:30');
    raise exception 'Yesterday unexpectedly succeeded';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.events (title,host_name,description,location,event_date,start_time,end_time)
    values ('Invalid past horizon','Club','Details','Room',latest + 1,'14:30','15:30');
    raise exception 'Today + 1 year + 1 day unexpectedly succeeded';
  exception when insufficient_privilege then null; end;
  begin
    -- RLS is checked before CHECK constraints; either rejection is correct.
    insert into public.events (title,host_name,description,location,event_date,start_time,end_time)
    values ('Invalid year 9999','Club','Details','Room','9999-12-31','14:30','15:30');
    raise exception 'Year 9999 event unexpectedly succeeded';
  exception when insufficient_privilege or check_violation then null; end;
end $$;
reset role;
rollback;
