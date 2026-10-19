# SideQuest — M1 Walking Skeleton User Requirements

These are **proposed M1-scoped requirements** based on the team's initial requirement that students can specify their free time and find SCU events they can attend. Review with the team and align with the original MVP requirements before submission.

1. **Create an event.** A user can enter an event name, location, calendar date, start time, and end time.
2. **See created events.** A user can view events they have created; events remain available after a page refresh in the same browser.
3. **Find an event during free time.** A user can enter a calendar date and time interval and see created events that fit **entirely** within that interval.
4. **Receive understandable feedback.** A user is informed about invalid event data, invalid search intervals, or when no events match.

## M1 scope / limitations

For this walking skeleton, events are **entered by users**, not hardcoded examples or live SCU events. Persistence is via browser localStorage, which **does not sync across computers, browsers, or accounts**. No authentication, backend database, travel time, ticketing, registrations, or overnight events are included. "Realistically participate" is currently approximated by exact date and full-duration matching only.
