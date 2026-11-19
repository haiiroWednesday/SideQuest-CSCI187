-- Run after the migration in an isolated PostgreSQL database as its owner.
-- Every test write is rolled back; this does not provision or alter live roles.
-- Anonymous inserts use a date one week ahead and short text with letters, inside
-- the posting RLS policy, so the CHECK-violation cases below still reach the CHECK
-- constraints.
begin;
set local role anon;
do $$
begin
  if not (select relrowsecurity from pg_class where oid='public.events'::regclass) then raise exception 'Row-level security must be enabled'; end if;
  if not has_table_privilege(current_user, 'public.events', 'SELECT') then raise exception 'anon must be able to read events'; end if;
  if has_table_privilege(current_user, 'public.events', 'UPDATE') or has_table_privilege(current_user, 'public.events', 'DELETE') then raise exception 'anon must not edit/delete public events'; end if;
  if has_column_privilege(current_user, 'public.events', 'id', 'INSERT') or has_column_privilege(current_user, 'public.events', 'created_at', 'INSERT') then raise exception 'database-owned columns must not be insertable'; end if;
end $$;
insert into public.events (title,host_name,description,location,event_date,start_time,end_time)
values ('SideQuest permission fixture','Fixture club','Test record rolled back','Fixture room',(now() at time zone 'America/Los_Angeles')::date + 7,'14:30','15:30');
do $$
begin
  if not exists (select 1 from public.events where title='SideQuest permission fixture') then raise exception 'anon insert/read failed'; end if;
  begin
    update public.events set title='unexpected mutation' where title='SideQuest permission fixture';
    raise exception 'UPDATE unexpectedly succeeded';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.events where title='SideQuest permission fixture';
    raise exception 'DELETE unexpectedly succeeded';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.events (id,title,host_name,description,location,event_date,start_time,end_time)
    values (gen_random_uuid(),'Unexpected supplied ID','Club','Details','Room',(now() at time zone 'America/Los_Angeles')::date + 7,'14:30','15:30');
    raise exception 'Client-assigned ID unexpectedly succeeded';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.events (title,host_name,description,location,event_date,start_time,end_time)
    values ('Invalid blank description','Club',' ','Room',(now() at time zone 'America/Los_Angeles')::date + 7,'14:30','15:30');
    raise exception 'Blank description unexpectedly succeeded';
  exception when check_violation then null; end;
  begin
    insert into public.events (title,host_name,description,location,event_date,start_time,end_time)
    values ('Invalid interval','Club','Details','Room',(now() at time zone 'America/Los_Angeles')::date + 7,'15:30','14:30');
    raise exception 'Reversed interval unexpectedly succeeded';
  exception when check_violation then null; end;
end $$;
reset role;
-- The posting-text RLS policy rejects descriptions over 1000 characters before
-- any CHECK runs, so the 2000-character CHECK is tested as the table owner.
do $$
begin
  begin
    insert into public.events (title,host_name,description,location,event_date,start_time,end_time)
    values ('Invalid length','Club',repeat('x',2001),'Room',(now() at time zone 'America/Los_Angeles')::date + 7,'14:30','15:30');
    raise exception 'Oversized description unexpectedly succeeded';
  exception when check_violation then null; end;
end $$;
rollback;
