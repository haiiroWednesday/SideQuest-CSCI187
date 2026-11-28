-- REVIEW ONLY: incremental policy update for the already-deployed personal tables.
-- Do not apply until the database owner approves the exact schema and rollback plan.
-- PostgREST verifies JWT signatures. Check provider-owned state for every private operation.
begin;
create function public.sidequest_private_active_actor()
returns uuid language sql stable security definer set search_path = ''
as $$
  select s.user_id
  from auth.sessions s
  join auth.users u on u.id = s.user_id
  where s.user_id = auth.uid()
    and s.id::text = auth.jwt()->>'session_id'
    and coalesce(auth.jwt()->>'is_anonymous', 'false') <> 'true'
    and case when jsonb_typeof(auth.jwt()->'exp') = 'number'
      then (auth.jwt()->>'exp')::numeric > extract(epoch from statement_timestamp())
      else false end
    and (s.not_after is null or s.not_after > statement_timestamp())
    and u.email_confirmed_at is not null
    and lower(u.email) ~ '^[^@[:space:]]+@([a-z0-9-]+[.])*scu[.]edu$'
$$;
alter function public.sidequest_private_active_actor() owner to postgres;
revoke all on function public.sidequest_private_active_actor() from public, anon, authenticated;
grant execute on function public.sidequest_private_active_actor() to authenticated;

-- Restrictive policies AND the existing ownership and validation policies.
-- A revoked token cannot read or mutate even its own rows through PostgREST.
create policy private_active_profile on public.profiles as restrictive for all to authenticated
  using (id = (select public.sidequest_private_active_actor()))
  with check (id = (select public.sidequest_private_active_actor()));
create policy private_active_plans on public.my_plans as restrictive for all to authenticated
  using (user_id = (select public.sidequest_private_active_actor()))
  with check (user_id = (select public.sidequest_private_active_actor()));
create policy private_active_someday on public.someday_ideas as restrictive for all to authenticated
  using (user_id = (select public.sidequest_private_active_actor()))
  with check (user_id = (select public.sidequest_private_active_actor()));
create policy private_active_busy on public.busy_times as restrictive for all to authenticated
  using (user_id = (select public.sidequest_private_active_actor()))
  with check (user_id = (select public.sidequest_private_active_actor()));
commit;
