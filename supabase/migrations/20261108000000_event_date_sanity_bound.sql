-- SideQuest M2: database sanity bound on event_date.
-- The app enforces the real rule (at most one year after the current campus
-- date, America/Los_Angeles) in the EventCatalog Model. A CHECK cannot use
-- current_date, so the database only rejects absurd dates such as 9999-12-31.
--
-- Fixed bound vs. trigger: a constant CHECK is declarative and immutable but
-- only catches absurd dates; a trigger could enforce the rolling one-year rule
-- but would duplicate the app's timezone logic in plpgsql. We use the CHECK.
--
-- NOT VALID: existing rows are not checked, so this migration cannot fail on
-- data already posted. New inserts and updates are checked. After cleaning up
-- old rows, run:
--   alter table public.events validate constraint event_date_sanity_bound;
-- Tests: app/tests/catalog.date-cap.test.ts (SQL text) and
-- supabase/tests/event_date_sanity_bound.sql (behavior, run in CI).

alter table public.events
  add constraint event_date_sanity_bound check (event_date < date '2100-01-01') not valid;
