-- SideQuest M2: posting-only text rules for anonymous inserts.
-- Same rules as catalogPostingErrors() in app/src/model/eventCatalog.ts:
--   * POSTING_LIMITS: trimmed title <= 80, host_name <= 60, location <= 120,
--     description <= 1000 characters.
--   * title, host_name and location contain at least one letter or digit.
--
-- These apply to new posts only. The CHECK constraints in
-- 20261103000000_create_events.sql (120/120/2000/200) are the storage ceiling
-- and are unchanged, so events posted before this rule stay valid and readable.
--
-- ALTER POLICY replaces the whole WITH CHECK expression, so the posting-horizon
-- date window from 20261110000000_event_date_posting_horizon.sql is repeated
-- here verbatim. Keep both rules in this expression when changing either one.
--
-- [[:alnum:]] depends on the collation's ctype: under "C" it matches ASCII
-- only, and under a libc locale it depends on the C library. The ICU collation
-- "und-x-icu" makes it ICU u_isalnum (Unicode letters L* and decimal digits
-- Nd) on any database, the same set as the app's /[\p{L}\p{Nd}]/u. Requires a
-- UTF-8 database built with ICU, as Supabase and the CI postgres:16 image are.
--
-- char_length counts code points; the app counts UTF-16 units and trims more
-- whitespace, so the app is never looser than this policy.
-- Behavior test: supabase/tests/event_text_posting_rules.sql.

alter policy "Anyone may submit a valid event" on public.events
  with check (
    event_date between (now() at time zone 'America/Los_Angeles')::date
                   and ((now() at time zone 'America/Los_Angeles')::date + interval '1 year')::date
    and char_length(btrim(title)) <= 80
    and char_length(btrim(host_name)) <= 60
    and char_length(btrim(location)) <= 120
    and char_length(btrim(description)) <= 1000
    and title     collate "und-x-icu" ~ '[[:alnum:]]'
    and host_name collate "und-x-icu" ~ '[[:alnum:]]'
    and location  collate "und-x-icu" ~ '[[:alnum:]]'
  );
