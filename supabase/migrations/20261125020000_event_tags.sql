-- SideQuest: optional host-set event tags students can filter on.
-- Same rule as normalizeTags() / EVENT_TAGS in app/src/model/eventTags.ts:
--   tags is null or an array of distinct values from
--   'free-food', 'guest-speaker', 'off-campus', 'registration' (at most four).
--
-- Also tags_by: 'host' or 'reviewer', required whenever tags are set.
--
-- REVIEW ONLY until Daven approves it. Until it is applied, the Node server notices the
-- missing column, logs one warning and keeps posting without tags.
-- Nullable: events posted before this column stay valid, readable and plannable.
-- The INSERT policy is not changed: a CHECK constraint is enough, since tags are optional.

-- CHECK constraints cannot hold subqueries, so "each tag once" lives in a small immutable function.
create or replace function public.sidequest_tags_distinct(tags text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select cardinality($1) = (select count(distinct t) from unnest($1) as t)
$$;

alter table public.events
  add column tags text[]
    constraint events_tags_known check (
      tags is null or (
        cardinality(tags) <= 4
        and tags <@ array['free-food', 'guest-speaker', 'off-campus', 'registration']::text[]
        and public.sidequest_tags_distinct(tags)
      )
    );

-- Who set the tags. Never inferred from words in the title: a host sets them on Post, and
-- an imported event's tags are set by the reviewer who checked it.
alter table public.events
  add column tags_by text
    constraint events_tags_by_known check (tags_by is null or tags_by in ('host', 'reviewer')),
  add constraint events_tags_need_source check (tags is null or cardinality(tags) = 0 or tags_by is not null);

-- Column grants: posters may write tags and tags_by. The Node server only ever writes 'host' for a
-- post (the client cannot send tags_by at all); 'reviewer' is for the reviewed import (PR #86).
-- If the team wants the database itself to refuse 'reviewer' from anon, add it to the INSERT policy
-- together with the rules in supabase/proposals/20261125010000_event_access_contact_REVIEW_ONLY.sql.
grant insert (tags, tags_by) on public.events to anon, authenticated;

comment on column public.events.tags is
  'Host-set attributes for Discover filters: free-food, guest-speaker, off-campus, registration.';
