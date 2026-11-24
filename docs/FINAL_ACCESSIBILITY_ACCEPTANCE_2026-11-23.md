# SideQuest final accessibility acceptance, November 23, 2026

**Status: automated checks added, human assistive-technology review pending.** Scope: #78 release candidate plus this test branch. Nothing here claims that manual keyboard, VoiceOver/NVDA, device permission, or contrast tests have already been performed. Use the exact verified release SHA when collecting evidence.

> **Update, Nov 24:** the checklist now lives in [`UX_CHECKS.md`](UX_CHECKS.md). A03 (320px, clipping, overlap) and the contrast half of A10 are automated there; the rest stay manual below.

## Automated evidence

`app/e2e/accessibility.spec.ts` scans basic Discover, Post, and My Schedule. New `app/e2e/accessibility-release-gate.spec.ts` exercises actual content and error states: an opened mobile event-detail dialog, consent-gated walking directions, Someday before/after an idea is saved, an invalid Post form, and denial of device location.

Both run on fake fixtures and automated axe-core WCAG A/AA checks. The new test attaches the **complete findings**, including moderate/minor issues, as per-scenario JSON to Playwright artifacts. A passing test guarantees no axe findings classified serious/critical on the inspected states; it does **not** prove full WCAG compliance, manual contrast acceptance, a usable screen reader, or an accessible physical path.

## Human acceptance script (record actual observations, do not fabricate)

Record tester, device, browser version, OS, test time, exact Git SHA, steps and screenshots/voice recording. Mark every scenario **Pass**, **Fail**, **Blocked**, or **Not run**. Fix failures and rerun on the final deployed commit.

| ID | Device/setup | Exact actions | Expected | Result / artifact |
| --- | --- | --- | --- | --- |
| A11Y-01 | Chrome desktop, keyboard only | Load Discover, press Tab repeatedly through primary nav, categories, Free on/from/until, first event, event detail actions | Focus visibly follows DOM order; all controls reachable, clearly named, no keyboard trap | Not run |
| A11Y-02 | iPhone/Safari + VoiceOver or desktop Chrome/NVDA at 375px | Load event list, announce `Inclusive Painting Workshop`, open details, inspect heading/host/date/venue, press Escape or Close | Meaningful heading and labels announced, modal focus stays inside on phone, closing returns focus to event | Not run |
| A11Y-03 | 320px viewport, browser zoom 200% separately | Open same event on phone; inspect calendar/map links, Use my location and Plan button; scroll vertically | No horizontal text clipping, hidden actions, unreadable labels or overlapping buttons | Not run |
| A11Y-04 | Keyboard, Post | Fill name Art Club Demo, host Campus Club, venue Library, tomorrow's date, start 15:00 end 14:00; submit | Specific invalid time announced, value retained, focus and error descriptions usable; correcting to end 16:00 allows posting | Not run |
| A11Y-05 | Keyboard + screen reader, Someday | Save `Paint with a friend`, note `Choose Saturday`; link a verified event, defer and revisit | Character limits announced, buttons and status distinguish action vs current state | Not run |
| A11Y-06 | Mobile HTTPS with location permission DENIED | Open event details, tap Use my location and deny browser prompt | Accessible error, Google Maps venue-search fallback, no direct walking-directions URL | Not run |
| A11Y-07 | Mobile HTTPS with location permission ALLOWED | Open same event, tap Use my location, then deliberately open walking directions | Permission before device API, separate action before sharing origin coordinates with external provider; clear accuracy and accessibility disclaimer | Not run |
| A11Y-08 | Public HTTPS, keyboard/VoiceOver, AI configured | Enter `I want to try something creative this weekend, maybe art or music`; submit | Search role, loading status, concrete interpreted dates and event names announced; errors clear; no false full-fit claim | Blocked: no verified live AI/hosting |
| A11Y-09 | Auth staging, distinct organizer/invitee roles | Sign in, open invited plan, change Works/If/Cannot, test private condition | Every control labeled, focus/alert states usable, another member's private note protected by live authorization | Blocked: group Auth/SQL not approved |
| A11Y-10 | Browser in dark/light mode, 200% zoom and simulated color vision | Read buttons, categories, badges, focus outlines and error states on all screens | Text and meaning don't depend only on color; contrast and focused controls manually verified | Not run |

## Tester evidence format

```text
Exact source SHA:
Deployment URL (or local review):
Reviewer / device / browser / AT:
Test ID:
Observed keyboard / spoken result:
Expected result:
Pass / Fail / Blocked:
Screenshot or trace link:
Issue and follow-up PR:
Retested SHA and outcome:
```

## Acceptance and rubric

This check supplies *test design and code* toward the accessibility (+0.25), automated end-to-end testing (+0.5) and external hardware (+0.25–0.75) categories, but does not award points. No team member should sign off accessibility without real manual checks. Automated passes must be associated with the tested final commit. Security-enabled group flows require authorized staging accounts and cannot be covered by placeholder actors.
