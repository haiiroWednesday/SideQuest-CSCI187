# Calendar-file (.ics) upload, taken off the screen on 27 Nov 2026

Cynthia's call: downloading a calendar file and uploading it is too much trouble. Students want one tap to connect.

- The button is hidden by `CALENDAR_FILE_ON = false` in `app/src/view/BringInBusy.tsx`. Set it to `true` to bring it back.
- Still in the app and still tested: `app/src/model/icsBusy.ts` (the reader), the busy-import port it shares with
  Google Calendar, and `app/tests/icsBusy.test.ts`.
- `bring-in-busy.spec.before.ts` is the browser spec as it was, with the two calendar-file tests.
