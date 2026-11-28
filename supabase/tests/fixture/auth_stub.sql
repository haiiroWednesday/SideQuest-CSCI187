-- TEST-ONLY fixture for an isolated PostgreSQL. Never run against a real Supabase project.
-- Stands in for what Supabase provides: the anon and authenticated roles, auth.users and auth.uid().
-- auth.uid() here reads a session setting and verifies nothing. It accepts both spellings the
-- tests use: request.jwt.claim.sub (older) and request.jwt.claims ->> 'sub' (current Supabase).
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
create schema auth;
create table auth.users (id uuid primary key);
grant usage on schema auth to anon, authenticated;
create function auth.uid() returns uuid language sql stable as $fixture$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::json ->> 'sub'
  )::uuid
$fixture$;
