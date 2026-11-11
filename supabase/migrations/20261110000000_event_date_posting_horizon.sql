-- SideQuest M2: enforce the posting horizon in the database for anonymous inserts.
-- Same rule as catalogPostingErrors() in app/src/model/eventCatalog.ts: an
-- event date from today through one year ahead, inclusive, in campus time
-- (America/Los_Angeles). `date + interval '1 year'` clamps Feb 29 to Feb 28,
-- matching latestPostingDate().
--
-- A CHECK cannot use now(), but an RLS policy is evaluated per statement, so it
-- can. The Node server reaches Supabase with the publishable key (role anon),
-- so every app post passes through this policy. The "already started today"
-- time rule stays in the Model and the server.
--
-- The 2100 CHECK (20261108000000_event_date_sanity_bound.sql) remains as a
-- sanity guard for roles that bypass RLS. ALTER POLICY replaces the condition
-- in a single statement. Behavior test: supabase/tests/event_date_posting_horizon.sql.

alter policy "Anyone may submit a valid event" on public.events
  with check (
    event_date between (now() at time zone 'America/Los_Angeles')::date
                   and ((now() at time zone 'America/Los_Angeles')::date + interval '1 year')::date
  );
