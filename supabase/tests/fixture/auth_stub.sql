-- TEST-ONLY fixture for an isolated PostgreSQL. Never run against a real Supabase project.
-- Stands in for what Supabase provides: the anon and authenticated roles, auth.users and auth.uid().
-- auth.uid() here reads a session setting and verifies nothing. It accepts both spellings the
-- tests use: request.jwt.claim.sub (older) and request.jwt.claims ->> 'sub' (current Supabase).
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
create schema auth;
create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz);
grant usage on schema auth to anon, authenticated;
create function auth.uid() returns uuid language sql stable as $fixture$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::json ->> 'sub'
  )::uuid
$fixture$;

-- Real group RPCs require a live session and an unexpired JWT. Model these
-- provider-owned facts only in the scratch database, never in a migration.
create table auth.sessions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  not_after timestamptz
);
create function auth.fixture_session() returns trigger language plpgsql as $fixture$
begin
  insert into auth.sessions(id,user_id) values (new.id,new.id);
  return new;
end;
$fixture$;
create trigger fixture_session after insert on auth.users
  for each row execute function auth.fixture_session();

-- The fixture session ID defaults to the user ID, matching the isolated group
-- SQL suite. Explicit JWT claims override defaults to exercise expired or
-- revoked sessions. The real-stack suite separately checks provider-issued JWTs.
create function auth.jwt() returns jsonb language sql stable as $fixture$
  select jsonb_build_object(
    'session_id', auth.uid(),
    'is_anonymous', false,
    'exp', extract(epoch from statement_timestamp()) + 3600
  ) || coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)
    || case when nullif(current_setting('request.jwt.claim.is_anonymous', true), '') is null
       then '{}'::jsonb else jsonb_build_object('is_anonymous',
         current_setting('request.jwt.claim.is_anonymous')::boolean) end
    || case when nullif(current_setting('request.jwt.claim.exp', true), '') is null
       then '{}'::jsonb else jsonb_build_object('exp',
         current_setting('request.jwt.claim.exp')::jsonb) end
$fixture$;
