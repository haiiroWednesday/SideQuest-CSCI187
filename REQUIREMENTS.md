# SideQuest — M1 Walking Skeleton: User Requirements

## Purpose and original P3 feature grouping

Feature grouping from P3: Determining whether an event fits.

> Original team requirement (preserved): Users should be able to specify a period of free time and find SCU events they could realistically participate in during that period.

Updated M1 scope: A user first creates an event in SideQuest, then searches the events they have created for those that fit a selected day and free-time window. This is one working end-to-end feature, not the full MVP.

## R1 — Create a campus event

Users should be able to add an event by entering an event name, location, calendar date, start time, and end time.

**Acceptance check:** With complete, valid information, selecting “Create event” adds the event to the list and displays a confirmation. The event is created through the application rather than being prewritten in its code.

## R2 — View, retain, and remove created events

Users should be able to see events they have created, including each event’s name, location, date, and times. Users should be able to remove an event they no longer want.

**Acceptance check:** A newly created event appears in “Your created events.” It remains after refreshing the page in the same browser when browser storage is available. Selecting “Remove” takes it out of the list.

## R3 — Find events that fit available time

Users should be able to select a calendar date and a free-time start and end, then see which of their created events fit within that available period.

**Acceptance check:** A matching event must take place on the selected date, start at or after the free-time start, and end at or before the free-time end. Show its name, location, date, and time. Do not list an event outside that window.

## R4 — Receive clear feedback

Users should be informed when required event details are missing, dates or times are invalid, or no events match their search.

**Acceptance check:** Invalid event information is rejected without adding an event; an invalid free-time window produces an explanatory message; searches with no results display an empty-state message.

## M1 boundaries and assumptions

- The walking skeleton uses events entered by its user; it does not retrieve or verify live SCU event listings.

- Created events are stored locally in that browser. They are not shared between teammates, devices, or accounts, and they may not persist if browser storage is unavailable.

- The current matching rule is date + full scheduled event duration. Walking time, registration, event eligibility, partial attendance, overnight activities, and campus-wide sharing are outside this milestone.

- “Realistically participate” remains the wider MVP goal. M1 tests the narrower, measurable question of whether the event’s entire scheduled time fits the user’s free-time window.

## Document status

Revised to match the current TypeScript + React SideQuest walking skeleton. Team should review and approve wording before final M1 submission.

---

**Related document:** [SideQuest Technical Specifications](SPECIFICATIONS.md) · [Google Docs source](https://docs.google.com/document/d/1yTrAU-RBO4YYBJLUYtjB1kb0U94_vN3iIjDeQBZ-gk0/edit)
