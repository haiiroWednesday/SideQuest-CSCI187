# Note for PR #86: SCU posting policy on imported events

SCU's advertising rules (scu.edu/csi/organizations/resources/advertising) ask every student
organization ad to name the organization and a contact, and to carry the Access Policy Statement
word for word:

> In compliance with the ADA/504, please direct your accommodation requests to NAME at EMAIL ADDRESS.

NAME is the primary student organizer; a phone number may replace the email. SCU also asks hosts
to advertise only after the room or space is confirmed.

This branch adds, in `app/src/model/eventCatalog.ts`:

- `hostKind`: `'student-org'` or `'department'`. Team decision (Nov 24): university department
  events may skip the statement; student organization events need it. A post with no host kind
  is held to the student organization rule.
- `organizer`, `contact` (email or phone, 7 to 15 digits), and `accessibility`, which is always
  built by `accessStatement(organizer, contact)` and never taken from a caller.
- `spaceConfirmed`: required on every post, not stored.

`POST /api/events` and the insert policy in
`supabase/proposals/20261125010000_event_access_contact_REVIEW_ONLY.sql` (review only, not applied)
enforce the same rules.

The campus intake code lives in #86, not on this branch, so here is what changes for it:

1. `prepareReviewedPublication()` calls `catalogPostingErrors()`, so a student organization
   candidate without an organizer and contact, or any candidate without `spaceConfirmed`, will now
   throw. Turn that into a visible review flag, not a failed batch.
2. Review step: set `hostKind` from the source (Campus Ministry, Sustainability, Theatre and Dance
   are departments; clubs are student organizations). Flag student organization candidates as
   **"Needs organizer contact"** when the source has none. Never make up a name or contact.
3. Normalisation: when the source page already has an ADA/504 line or an organizer email, copy
   the name and contact into `organizer` / `contact`. The statement is rebuilt from them.
4. `spaceConfirmed` for imports means the reviewer saw the room on the source listing. Set it in
   the review step, not automatically.
5. `supabase/review/campus_intake_publication.sql` inserts through the same policy, so it needs
   `host_kind`, `organizer`, `contact` and `accessibility` in its insert list once the migration
   is applied.
6. Tests to add in #86: a department candidate publishes without the statement; a student
   organization candidate without a contact is flagged and not published.
