-- REVIEW ONLY. A proposal, not a migration: it sits outside supabase/migrations so
-- `supabase db push` cannot apply it. Apply it by hand once the team approves.
-- Behaviour test: supabase/proposals/tests/event_attend_review.sql.
--
-- SideQuest: how an event is attended. The host picks one of two on Post ("How to attend"):
--   Starts at a set time  a talk, a show, a workshop: be there for all of it. This is the default.
--   Drop in any time      a fair, tabling, an open studio, a study jam.
-- Why: the fit rule says an event fits a student's free time only when the whole event is
-- inside it. That hides a four-hour volunteer fair from someone with 45 free minutes who could
-- simply stop by. A drop-in event fits when it shares at least 20 minutes with the free time
-- (MIN_DROP_IN_MINUTES in app/src/model/attend.ts). Set-time events fit exactly as before.
--
-- Same rule as isAttendMode() / attendOf() in app/src/model/attend.ts and toEventRow() /
-- fromEventRow() in app/src/model/eventCatalog.ts:
--   attend is NULL (a set-time event) or one of 'set', 'dropin'.
--   The app writes only 'dropin'. A set-time post leaves the column NULL, so it is stored
--   exactly like every event from before this column, and like every imported event.
--   NULL is never read as drop-in, and nothing is guessed from a title or description.
--
-- Nullable, no default and no backfill: existing rows keep NULL and stay valid, readable and
-- plannable. The INSERT policy is not changed: the CHECK constraint is enough for an optional
-- value. Until this is applied, the Node server notices the missing column, logs one
-- "Schema check:" line and keeps posting without it (app/src/model/supabaseEventTable.ts),
-- which saves a drop-in post as a set-time event.

alter table public.events
  add column attend text
    constraint events_attend_known check (attend is null or attend in ('set', 'dropin'));

-- Column grant: posters may write attend as well as the columns they already may.
grant insert (attend) on public.events to anon, authenticated;

comment on column public.events.attend is
  'How to attend, set by the host on Post: ''dropin'' (stop by any time; fits free time that shares 20 minutes or more with it) or ''set''. NULL means ''set'': be there for all of it. Never inferred from the title.';
