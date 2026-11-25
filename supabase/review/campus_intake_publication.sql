-- REVIEW ONLY: do not put this in migrations or apply to a shared database.
-- First publication of a reviewed occurrence, with atomic identity mapping.
-- Executable by the database owner in a disposable fixture. No public RPC,
-- service key, automatic scheduler, updates or cancellation are authorized.
begin;
create schema sidequest_intake;
revoke all on schema sidequest_intake from public, anon, authenticated;

create table sidequest_intake.source_occurrences (
  provider text not null check (provider ~ '^[a-z][a-z0-9-]{1,63}$'),
  occurrence_id text not null check (occurrence_id ~ '^[A-Za-z0-9._:@-]{1,160}$'),
  event_id uuid not null unique references public.events(id) on delete restrict,
  source_url text not null check (length(source_url) <= 500 and source_url ~ '^https://[^/?#@[:space:]]+/[^?#[:space:]]*$'),
  checked_at timestamptz not null,
  revision integer not null default 1 check (revision > 0),
  primary key (provider, occurrence_id)
);
alter table sidequest_intake.source_occurrences enable row level security;
revoke all on sidequest_intake.source_occurrences from public, anon, authenticated;

create function sidequest_intake.publish_reviewed_occurrence(
  p_provider text, p_occurrence_id text, p_source_url text, p_checked_at timestamptz,
  p_title text, p_host text, p_description text, p_location text,
  p_date date, p_start time, p_end time
) returns uuid
language plpgsql security invoker set search_path = pg_catalog
as $$
declare
  existing sidequest_intake.source_occurrences%rowtype;
  published public.events%rowtype;
  campus_now timestamp := statement_timestamp() at time zone 'America/Los_Angeles';
  new_id uuid;
begin
  if p_provider is null or p_provider !~ '^[a-z][a-z0-9-]{1,63}$'
    or p_occurrence_id is null or p_occurrence_id !~ '^[A-Za-z0-9._:@-]{1,160}$'
    or p_source_url is null or length(p_source_url) > 500
    or p_source_url !~ '^https://[^/?#@[:space:]]+/[^?#[:space:]]*$'
    or p_checked_at is null or not isfinite(p_checked_at) or p_checked_at > statement_timestamp()
    or p_checked_at < statement_timestamp() - interval '7 days'
  then raise exception 'Invalid or stale source evidence' using errcode = '22023'; end if;

  if p_title is null or char_length(btrim(p_title)) not between 1 and 80
    or p_host is null or char_length(btrim(p_host)) not between 1 and 60
    or p_description is null or char_length(btrim(p_description)) not between 1 and 1000
    or p_location is null or char_length(btrim(p_location)) not between 1 and 120
    or p_title collate pg_catalog."und-x-icu" !~ '[[:alnum:]]'
    or p_host collate pg_catalog."und-x-icu" !~ '[[:alnum:]]'
    or p_location collate pg_catalog."und-x-icu" !~ '[[:alnum:]]'
    or p_date is null or p_start is null or p_end is null
    or p_start >= p_end or p_end >= time '24:00'
    or extract(second from p_start) <> 0 or extract(second from p_end) <> 0
  then raise exception 'Invalid reviewed event' using errcode = '22023'; end if;

  -- Serialize pilot publications and manual inserts during duplicate checking.
  -- This coarse lock is a deliberate small-pilot choice, not a bulk importer.
  lock table public.events in share row exclusive mode;
  select * into existing from sidequest_intake.source_occurrences
    where provider = p_provider and occurrence_id = p_occurrence_id;
  if found then
    select * into strict published from public.events where id = existing.event_id;
    if row(published.title, published.host_name, published.description, published.location,
           published.event_date, published.start_time, published.end_time, existing.source_url)
       is distinct from row(btrim(p_title), btrim(p_host), btrim(p_description), btrim(p_location),
                            p_date, p_start, p_end, p_source_url) then
      raise exception 'Changed occurrence requires separate update/consent review' using errcode = '22023';
    end if;
    return existing.event_id;
  end if;

  if p_date < campus_now::date or p_date > (campus_now::date + interval '1 year')::date
    or (p_date = campus_now::date and p_start < date_trunc('minute', campus_now)::time)
  then raise exception 'Outside current posting window' using errcode = '22023'; end if;

  -- Conservative collision guard; never attach to a manually posted event.
  if exists (select 1 from public.events e
    where e.event_date = p_date and e.start_time = p_start
      and lower(btrim(e.title)) = lower(btrim(p_title))
      and lower(btrim(e.location)) = lower(btrim(p_location))) then
    raise exception 'Possible duplicate requires separate review' using errcode = '22023';
  end if;

  insert into public.events(title, host_name, description, location, event_date, start_time, end_time)
    values (btrim(p_title), btrim(p_host), btrim(p_description), btrim(p_location), p_date, p_start, p_end)
    returning id into new_id;
  insert into sidequest_intake.source_occurrences(provider, occurrence_id, event_id, source_url, checked_at)
    values (p_provider, p_occurrence_id, new_id, p_source_url, p_checked_at);
  return new_id;
end
$$;
revoke all on function sidequest_intake.publish_reviewed_occurrence(
  text,text,text,timestamptz,text,text,text,text,date,time,time
) from public, anon, authenticated;
commit;
