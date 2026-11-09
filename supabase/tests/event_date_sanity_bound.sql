-- Run after 20261108000000_event_date_sanity_bound.sql in an isolated
-- PostgreSQL database as its owner. Test owner: Daven.
-- Every test write is rolled back; this does not provision or alter live roles.
begin;
set local role anon;
insert into public.events (title,host_name,description,location,event_date,start_time,end_time)
values ('SideQuest date bound fixture','Fixture club','Test record rolled back','Fixture room','2099-12-31','14:30','15:30');
do $$
begin
  if not exists (select 1 from public.events where title='SideQuest date bound fixture') then raise exception 'Date just below the sanity bound was not stored'; end if;
  begin
    insert into public.events (title,host_name,description,location,event_date,start_time,end_time)
    values ('Invalid far-future date','Club','Details','Room','2100-01-01','14:30','15:30');
    raise exception 'Event date at the sanity bound unexpectedly succeeded';
  exception when check_violation then null; end;
  begin
    insert into public.events (title,host_name,description,location,event_date,start_time,end_time)
    values ('Invalid year 9999','Club','Details','Room','9999-12-31','14:30','15:30');
    raise exception 'Year 9999 event unexpectedly succeeded';
  exception when check_violation then null; end;
end $$;
reset role;
rollback;
