-- Run after 20261125010000_event_access_contact.sql in an isolated PostgreSQL
-- database as its owner. Every test write is rolled back.
-- Checks: new posts need the organizer, an email or phone contact, and SCU's Access
-- Policy Statement word for word; rows from before the migration keep NULL and stay readable.
begin;
-- An event posted before the rule (owner insert, no policy), with NULL in the new columns.
insert into public.events (title,host_name,description,location,event_date,start_time,end_time)
values ('Old post', 'Club', 'Details', 'Room', (now() at time zone 'America/Los_Angeles')::date + 3, '10:00', '11:00');

set local role anon;
do $$
declare
  test record;
  campus_week date := (now() at time zone 'America/Los_Angeles')::date + 7;
  stored boolean;
  old_rows int;
  statement text;
begin
  select count(*) into old_rows from public.events
   where title = 'Old post' and organizer is null and contact is null and accessibility is null;
  if old_rows <> 1 then raise exception 'older event without the new fields is not readable'; end if;

  -- Department events may skip the statement; a statement they give must still be exact.
  for test in select * from (values
    ('department, nothing',          'department',  null,       null,          null,                                  true),
    ('department, full statement',   'department',  'Ana Ruiz', 'ana@scu.edu', 'STATEMENT',                           true),
    ('department, organizer only',   'department',  'Ana Ruiz', null,          null,                                  false),
    ('department, other wording',    'department',  'Ana Ruiz', 'ana@scu.edu', 'Email Ana.',                          false),
    ('student org, nothing',         'student-org', null,       null,          null,                                  false),
    ('no kind, nothing',             null,          null,       null,          null,                                  false),
    ('student org, full statement',  'student-org', 'Ana Ruiz', 'ana@scu.edu', 'STATEMENT',                           true)
  ) as cases(label, kind, organizer, contact, statement, accepted) loop
    begin
      insert into public.events (title,host_name,description,location,event_date,start_time,end_time,host_kind,organizer,contact,accessibility)
      values ('Fixture', 'Club', 'Details', 'Room', campus_week, '14:00', '15:00', test.kind, test.organizer, test.contact,
              case when test.statement = 'STATEMENT' then 'In compliance with the ADA/504, please direct your accommodation requests to '
                   || test.organizer || ' at ' || test.contact || '.' else test.statement end);
      stored := true;
    exception when check_violation or insufficient_privilege then
      stored := false;
    end;
    if stored <> test.accepted then
      raise exception 'case "%": expected accepted=%, got %', test.label, test.accepted, stored;
    end if;
  end loop;
  begin
    insert into public.events (title,host_name,description,location,event_date,start_time,end_time,host_kind)
    values ('Fixture', 'Club', 'Details', 'Room', campus_week, '14:00', '15:00', 'club');
    raise exception 'an unknown host_kind was accepted';
  exception when check_violation or insufficient_privilege then null;
  end;

  for test in select * from (values
    ('email contact',            'Ana Ruiz', 'ana@scu.edu', null, true),
    ('phone contact',            'Ana Ruiz', '(408) 554-4000', null, true),
    ('Unicode organizer 李华',    '李华', 'lihua@scu.edu', null, true),
    ('organizer at 60',          repeat('a',60), 'ana@scu.edu', null, true),
    ('organizer at 61',          repeat('a',61), 'ana@scu.edu', null, false),
    ('name as contact',          'Ana Ruiz', 'Ana', null, false),
    ('short phone',              'Ana Ruiz', '554-40', null, false),
    ('broken email',             'Ana Ruiz', 'ana@scu', null, false),
    ('no organizer',             null, 'ana@scu.edu', null, false),
    ('no contact',               'Ana Ruiz', null, null, false),
    ('symbols-only organizer',   '!!!', 'ana@scu.edu', null, false),
    ('other wording',            'Ana Ruiz', 'ana@scu.edu', 'Email Ana for accommodations.', false),
    ('no statement',             'Ana Ruiz', 'ana@scu.edu', '', false)
  ) as cases(label, organizer, contact, override, accepted) loop
    statement := coalesce(test.override, 'In compliance with the ADA/504, please direct your accommodation requests to '
                 || coalesce(test.organizer, '') || ' at ' || coalesce(test.contact, '') || '.');
    if test.label = 'no statement' then statement := null; end if;
    begin
      insert into public.events (title,host_name,description,location,event_date,start_time,end_time,organizer,contact,accessibility)
      values ('Fixture', 'Club', 'Details', 'Room', campus_week, '14:00', '15:00', test.organizer, test.contact, statement);
      stored := true;
    exception when check_violation or insufficient_privilege then
      stored := false;
    end;
    if stored <> test.accepted then
      raise exception 'case "%": expected accepted=%, got %', test.label, test.accepted, stored;
    end if;
  end loop;

  -- The seven original columns alone are no longer enough for a new post.
  begin
    insert into public.events (title,host_name,description,location,event_date,start_time,end_time)
    values ('Fixture', 'Club', 'Details', 'Room', campus_week, '14:00', '15:00');
    raise exception 'a post without organizer, contact and statement was accepted';
  exception when check_violation or insufficient_privilege then null;
  end;
end $$;
rollback;
