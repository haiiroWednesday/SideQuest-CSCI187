-- Run after 20261111000000_event_text_posting_rules.sql in an isolated
-- PostgreSQL database as its owner.
-- Every test write is rolled back; this does not provision or alter live roles.
-- Anonymous inserts use a date one week ahead, inside the posting horizon, so
-- each rejection below comes from the text rules unless stated otherwise.
begin;
set local role anon;
do $$
declare
  test record;
  campus_week date := (now() at time zone 'America/Los_Angeles')::date + 7;
  latest date := ((now() at time zone 'America/Los_Angeles')::date + interval '1 year')::date;
  stored boolean;
begin
  for test in select * from (values
    ('title at 80',            repeat('x',80), 'Club', 'Details', 'Room', true),
    ('title at 81',            repeat('x',81), 'Club', 'Details', 'Room', false),
    ('host at 60',             'Fixture', repeat('x',60), 'Details', 'Room', true),
    ('host at 61',             'Fixture', repeat('x',61), 'Details', 'Room', false),
    ('location at 120',        'Fixture', 'Club', 'Details', repeat('x',120), true),
    ('location at 121',        'Fixture', 'Club', 'Details', repeat('x',121), false),
    ('description at 1000',    'Fixture', 'Club', repeat('x',1000), 'Room', true),
    ('description at 1001',    'Fixture', 'Club', repeat('x',1001), 'Room', false),
    ('trimmed title at 80',    '  ' || repeat('x',80) || '  ', 'Club', 'Details', 'Room', true),
    ('title &&&&',             '&&&&', 'Club', 'Details', 'Room', false),
    ('host &&&&',              'Fixture', '&&&&', 'Details', 'Room', false),
    ('location &&&&',          'Fixture', 'Club', 'Details', '&&&&', false),
    ('title !!!',              '!!!', 'Club', 'Details', 'Room', false),
    ('title emoji only',       '🎉🎉', 'Club', 'Details', 'Room', false),
    ('title No digits only',   '½²①', 'Club', 'Details', 'Room', false),
    ('title 読書会',            '読書会', 'Club', 'Details', 'Room', true),
    ('host 読書会',             'Fixture', '読書会', 'Details', 'Room', true),
    ('location 読書会',         'Fixture', 'Club', 'Details', '読書会', true),
    ('title Café Night',       'Café Night', 'Club', 'Details', 'Room', true),
    ('title emoji with text',  '🎉 Party 2', 'Club', 'Details', 'Room', true),
    ('title Arabic-Indic digit', '٣', 'Club', 'Details', 'Room', true),
    ('description &&&&',       'Fixture', 'Club', '&&&&', 'Room', true)
  ) as cases(label, title, host_name, description, location, accepted) loop
    begin
      insert into public.events (title,host_name,description,location,event_date,start_time,end_time)
      values (test.title, test.host_name, test.description, test.location, campus_week, '14:30', '15:30');
      stored := true;
    exception when insufficient_privilege then stored := false; end;
    if stored <> test.accepted then
      raise exception 'Text rule case "%" expected accepted=% but got %', test.label, test.accepted, stored;
    end if;
  end loop;
  -- ALTER POLICY replaced the whole expression; the date window must still apply.
  insert into public.events (title,host_name,description,location,event_date,start_time,end_time)
  values ('Text rules last day','Club','Details','Room',latest,'14:30','15:30');
  begin
    insert into public.events (title,host_name,description,location,event_date,start_time,end_time)
    values ('Text rules past horizon','Club','Details','Room',latest + 1,'14:30','15:30');
    raise exception 'A date past one year unexpectedly succeeded';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.events (title,host_name,description,location,event_date,start_time,end_time)
    values ('Text rules yesterday','Club','Details','Room',campus_week - 8,'14:30','15:30');
    raise exception 'Yesterday unexpectedly succeeded';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
-- The table owner bypasses RLS: the storage ceiling is still 120/120/2000/200,
-- so rows stored before the posting rules remain valid.
insert into public.events (title,host_name,description,location,event_date,start_time,end_time)
values (repeat('&',120), repeat('h',120), repeat('d',2000), repeat('l',200),
        (now() at time zone 'America/Los_Angeles')::date + 7, '14:30', '15:30');
do $$
begin
  begin
    insert into public.events (title,host_name,description,location,event_date,start_time,end_time)
    values (repeat('x',121),'Club','Details','Room',(now() at time zone 'America/Los_Angeles')::date + 7,'14:30','15:30');
    raise exception 'The 120-character title CHECK no longer applies';
  exception when check_violation then null; end;
end $$;
rollback;
