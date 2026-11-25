-- Live privacy check for 20261124000000_accounts_personal_tables.sql, run in the hosted SQL editor
-- on 24 Nov 2026. It creates two throwaway users, tests access, then raises an error so the whole
-- block rolls back and nothing is kept. Result on Daven's project:
-- A sees own plans: 1 | ready without event: refused | 90-char title: refused | B sees A plans: 0 |
-- B sees A ideas: 0 | B sees A busy: 0 | B sees A profile: 0 | B changed A ideas: 0 |
-- B wrote into A plans: refused | B reads events: 1 | anon reads plans: refused
do $$
declare a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); ev uuid; r text := ''; n int;
begin
  insert into auth.users (id, aud, role, email) values (a, 'authenticated', 'authenticated', 'check-a@example.invalid'), (b, 'authenticated', 'authenticated', 'check-b@example.invalid');
  insert into public.events (title, host_name, description, location, event_date, start_time, end_time)
    values ('Check event', 'Check', 'Check', 'Benson', (now() at time zone 'America/Los_Angeles')::date + 1, '10:00', '11:00') returning id into ev;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.my_plans (event_id) values (ev);
  insert into public.someday_ideas (title) values ('Boba run');
  insert into public.busy_times (busy_date, start_time, end_time) values (current_date, '09:00', '10:00');
  insert into public.profiles (id, display_name) values (a, 'A');
  select count(*) into n from public.my_plans; r := r || 'A sees own plans: ' || n;
  begin insert into public.someday_ideas (title, status) values ('x', 'ready'); r := r || ' | ready without event: ALLOWED (bad)'; exception when check_violation then r := r || ' | ready without event: refused'; end;
  begin insert into public.events (title, host_name, description, location, event_date, start_time, end_time) values (repeat('x', 90), 'A', 'd', 'Benson', current_date + 1, '10:00', '11:00'); r := r || ' | 90-char title: ALLOWED (bad)'; exception when others then r := r || ' | 90-char title: refused'; end;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.my_plans; r := r || ' | B sees A plans: ' || n;
  select count(*) into n from public.someday_ideas; r := r || ' | B sees A ideas: ' || n;
  select count(*) into n from public.busy_times; r := r || ' | B sees A busy: ' || n;
  select count(*) into n from public.profiles; r := r || ' | B sees A profile: ' || n;
  update public.someday_ideas set title = 'stolen' where title = 'Boba run'; get diagnostics n = row_count; r := r || ' | B changed A ideas: ' || n;
  begin insert into public.my_plans (user_id, event_id) values (a, ev); r := r || ' | B wrote into A plans: ALLOWED (bad)'; exception when others then r := r || ' | B wrote into A plans: refused'; end;
  select count(*) into n from public.events; r := r || ' | B reads events: ' || n;
  reset role; set local role anon;
  begin select count(*) into n from public.my_plans; r := r || ' | anon reads plans: ALLOWED (bad)'; exception when insufficient_privilege then r := r || ' | anon reads plans: refused'; end;
  reset role;
  raise exception 'CHECK DONE (rolled back): %', r;
end $$;
