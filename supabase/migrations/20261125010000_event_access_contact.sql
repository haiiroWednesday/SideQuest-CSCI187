-- SideQuest: SCU's posting policy on events (scu.edu/csi/organizations/resources/advertising).
-- Every ad includes the organization's name and contact information, and the Access Policy
-- Statement: "In compliance with the ADA/504, please direct your accommodation requests to
-- NAME at EMAIL ADDRESS." NAME is the primary student organizer; a phone number may replace
-- the email. Same rules as catalogPostingErrors(), ACCESS_LIMITS and accessStatement() in
-- app/src/model/eventCatalog.ts:
--   * organizer:     trimmed, 1 to 60 characters, at least one letter or digit
--   * contact:       trimmed, an email address or a phone number (7 to 15 digits), <= 120
--   * accessibility: exactly the statement built from organizer and contact, <= 500
-- host_kind says who hosts: 'student-org' events must carry all three; 'department' events
-- (university departments) may skip them, but a statement they do give must be exact. A post
-- with no host_kind is held to the student organization rule. Nothing verifies the kind yet:
-- posting is anonymous, so a post could claim 'department'. Revisit once posting needs sign-in.
-- The organization's name is the existing host_name. The "room or space is confirmed" check
-- on Post gates posting in the app and server and is not stored.
--
-- REVIEW ONLY until Daven approves it. Until it is applied, the Node server notices the
-- missing columns, logs one warning and keeps posting the seven original columns.
--
-- The columns are nullable: events posted before this rule keep NULL and stay valid,
-- readable and plannable. Only the INSERT policy requires them for new posts.
--
-- ALTER POLICY replaces the whole WITH CHECK expression, so the date window
-- (20261110000000) and the text rules (20261111000000) are repeated verbatim below.
-- Keep all three rule sets in this one expression when changing any of them.
-- Behaviour test: supabase/tests/event_access_contact.sql.

alter table public.events
  add column organizer text
    constraint events_organizer_length check (organizer is null or char_length(organizer) <= 60),
  add column contact text
    constraint events_contact_length check (contact is null or char_length(contact) <= 120),
  add column accessibility text
    constraint events_accessibility_length check (accessibility is null or char_length(accessibility) <= 500),
  add column host_kind text
    constraint events_host_kind_values check (host_kind is null or host_kind in ('student-org', 'department'));

-- Column grants: posters may write these three columns as well as the original seven.
grant insert (organizer, contact, accessibility, host_kind) on public.events to anon, authenticated;

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
    -- SCU posting policy: organizer, contact and the Access Policy Statement word for word.
    -- Departments may leave all three empty; anyone else, or a department that fills them, must be exact.
    and (
      (host_kind = 'department' and organizer is null and contact is null and accessibility is null)
      or (
        organizer is not null
        and char_length(btrim(organizer)) between 1 and 60
        and organizer collate "und-x-icu" ~ '[[:alnum:]]'
        and contact is not null
        and char_length(btrim(contact)) between 1 and 120
        and (
          btrim(contact) ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
          or (btrim(contact) ~ '^\+?[0-9 ().-]+$'
              and char_length(regexp_replace(contact, '[^0-9]', '', 'g')) between 7 and 15)
        )
        and accessibility = 'In compliance with the ADA/504, please direct your accommodation requests to '
                            || btrim(organizer) || ' at ' || btrim(contact) || '.'
      )
    )
  );
