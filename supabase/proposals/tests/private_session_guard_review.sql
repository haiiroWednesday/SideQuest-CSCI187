-- Scratch PostgreSQL only. Simulated claims, not JWT signature verification.
begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('11111111-1111-4111-8111-111111111111','owner@scu.edu',now()),
 ('22222222-2222-4222-8222-222222222222','other@scu.edu',now()),
 ('33333333-3333-4333-8333-333333333333','outside@example.test',now());
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
insert into public.profiles(id,display_name) values (auth.uid(),'Owner');
insert into public.busy_times(busy_date,start_time,end_time,source) values (current_date+1,'10:00','11:00','typed');
do $check$
begin
 if public.sidequest_private_active_actor() is distinct from auth.uid() or (select count(*) from public.busy_times) <> 1 then
   raise exception 'Active owner denied';
 end if;
end $check$;
reset role;
delete from auth.sessions where user_id='11111111-1111-4111-8111-111111111111';
set role authenticated;
do $check$
begin
 if public.sidequest_private_active_actor() is not null
    or exists(select 1 from public.profiles)
    or exists(select 1 from public.my_plans)
    or exists(select 1 from public.someday_ideas)
    or exists(select 1 from public.busy_times) then
   raise exception 'Revoked session retained access';
 end if;
 delete from public.busy_times;
 if found then raise exception 'Revoked session deleted a row'; end if;
 update public.profiles set display_name='Wrong';
 if found then raise exception 'Revoked session updated a row'; end if;
 begin
   insert into public.busy_times(busy_date,start_time,end_time,source) values (current_date+1,'12:00','13:00','typed');
   raise exception 'Revoked session inserted a row';
 exception when insufficient_privilege then null;
 end;
 perform set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
 if public.sidequest_private_active_actor() is distinct from auth.uid() or exists(select 1 from public.busy_times) then
   raise exception 'Other active account failed or saw owner rows';
 end if;
 perform set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
 if public.sidequest_private_active_actor() is not null then raise exception 'Outside account admitted'; end if;
end $check$;
reset role;
do $check$
begin
 if (select count(*) from public.busy_times) <> 1 or (select display_name from public.profiles) <> 'Owner' then
   raise exception 'Revoked session modified stored data';
 end if;
end $check$;
rollback;
