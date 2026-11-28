// Content of "SideQuest flow and demo". Edit here when the UI changes, then retake the screenshots.
// Step: [case id, what happens, state (stays | change | build | cut), note, repeat codes]
const DECIDED = [
  'Opening the app shows events. Discover is one page: interests on top, the list under them.',
  'The week of busy and free time moves to My Schedule. That is where you edit busy time and open or remove a plan.',
  'Setup appears only when we know nothing about your time: no busy time added and Google not connected. It is a pop-up, not a page you can switch back to.',
  'No "Our pick", no Picks step, no separate What step.',
  'The calendar-file upload goes. People want one tap to connect. Off the screen since Nov 27.',
  'Done Nov 27: 16 messages reworded from your picks, "Mark busy" and "Who\'s in?" off the free slips, Someday inside My Schedule on a laptop too.',
  'Next to build: Google connect on a screen, the bolder look with stars. The mic gets a real-phone test.',
  'The day runs all 24 hours, not 8am to 11pm. Not built yet. Posting gets the same fix (today it allows 6am to 11pm).',
  'Posting: the host picks a building from the map\'s places and adds a room, or drops a pin for anywhere else. Not built yet: today it is one text box. The pin needs a new shared event field, so the team is asked first.',
  'Someday: the "Someday ideas" link and the page itself both need a redesign. Later.',
  'Header clock: the first engraved dial, solid gold diamonds, small round moon. Gears wait until there are settings.',
  'The whole app must be autism and ADHD friendly: one job per screen, little to read, pictures over words.',
]
// Open item: [key, text]. Keys are saved with her answers.
const OPEN = [
  ['setup-frequency', 'How often setup returns: only once, weekly, or whenever the coming week is empty.'],
  ['week-trail-merge', 'How the week and the Trail merge in My Schedule. Each has strengths, so this needs a design round.'],
  ['discover-free-strip', 'How Discover shows what it is filtering by when there are several free stretches. Words alone will not do.'],
  ['words', 'Two new ticket notes to pick (w19 and w20 in Words to fix).'],
  ['repeats', 'C5 has a new proposal after your note: keep both filters, make free time a chip.'],
  ['bold-look', 'A bolder, organic look with stars in the pages. Its own design round, after the cuts.'],
]
const TALK = [
  ['1–2 min', 'Problem and user', ['Students have gaps between classes and miss what is on campus', 'Who: an SCU student with a full week and a few free stretches', 'From the interviews: plans start from time and friends, then interest']],
  ['30 s', 'Elevator pitch', ['Tell SideQuest when you are busy, once', 'It shows the campus events that fit your free time', 'Plan in one tap, walk there, bring friends']],
  ['3–6 min', 'Demo, flows A to F', ['A. First visit (1:00)', 'B. Find and plan (1:30)', 'C. Get there (0:40)', 'D. My Schedule (1:00)', 'E. Groups (0:50)', 'F. Host an event (0:40)']],
  ['1–2 min', 'Conclusion', ['What the usability study changed', 'Was it a success, and why', 'What we would do next (see Q&A 9)']],
]
const FLOWS = [
  ['A', 'First visit: tell us when you are busy', '1:00', [
    ['new-discover', 'A new student opens SideQuest.', 'build', 'Becomes the setup pop-up', ['C1']],
    ['google-today', 'Connect Google Calendar. Its busy time comes in, in Google blue.', 'build', 'The connect button is not on a screen yet', ['C11']],
    ['discover-bringin-read', 'Or say it in a sentence: "Class MWF 10 to 11". Tick what it found.', 'change', 'Mic needs a real-phone test', ['C2']],
    ['step-when-edit', 'Or add a busy time by hand.', 'change', 'Moves into setup and My Schedule', ['C2', 'C5']],
    ['step-events', 'Done. Discover opens.', 'stays', '', []],
  ]],
  ['B', 'Find something and plan it', '1:30', [
    ['step-events', 'Discover: events that fit your free time, each with a fit mark.', 'change', 'Loses the step bar. This is what opens first', ['C3', 'C12']],
    ['step-events-picked', 'Narrow by interest. The list changes right under the filters.', 'stays', '', ['C7']],
    ['card-later', 'Open a ticket: time, place, photo, Plan it.', 'stays', '', ['C8']],
    ['card-plan', 'Plan it. It goes to My Schedule, with Undo.', 'stays', '', []],
    ['card-friends', 'See friends from your groups who are going.', 'stays', '', []],
    ['card-dropin', 'A drop-in event fits with 20 shared minutes.', 'stays', '', []],
  ]],
  ['C', 'Get there', '0:40', [
    ['walk', 'Walk there, from the ticket, on our own campus map.', 'stays', 'The message here is on the Words list', ['C8']],
    ['map-fits', 'The map can show only what fits.', 'stays', '', ['C3']],
  ]],
  ['D', 'My Schedule', '1:00', [
    ['schedule', 'Today first. The day is drawn as a trail, with free time beside it.', 'change', 'Merges with the week', ['C1', 'C9']],
    ['step-when', 'Your week of busy, free and Google time.', 'change', 'Moves here from Discover. Grows to 24 hours', ['C1', 'C3']],
    ['schedule-clash', 'Two plans at once: the clash sheet asks which to keep.', 'stays', '', []],
    ['schedule-tickets', 'The same plans as tickets.', 'stays', '', ['C9']],
    ['someday', 'Someday: ideas with no date yet.', 'stays', '', ['C4']],
  ]],
  ['E', 'Groups', '0:50', [
    ['groups', 'Who is free now, and your groups.', 'stays', '', ['C6']],
    ['groups-share', 'Share your free time and see when everyone is free.', 'stays', '', ['C1', 'C6']],
    ['groups-invite', 'A group invites you to an event.', 'stays', '', []],
  ]],
  ['F', 'Host an event', '0:40', [
    ['post', 'Post an event: name, host, place, time, set time or drop in.', 'build', 'Place becomes pick a building plus a room, or drop a pin. Times cover all 24 hours', []],
    ['post-errors', 'Anything missing is said next to its field.', 'stays', '', []],
    ['card-now', 'At your own live event you can share leftover food. The ticket then says "Food left" and leads today\'s list.', 'stays', '', ['C7']],
  ]],
]
// Repeat: [code, title, what, proposal, screenshots, decided (text) or undefined]
const CUL = [
  ['C1', 'One week, three places', 'Discover, My Schedule and Groups each draw your time.', '', ['step-when', 'schedule', 'groups-share'], 'One week, in My Schedule. Discover only lists events. How the week and the Trail merge is a design round.'],
  ['C12', 'Steps for a one-page job', 'Discover had a step bar, a "See what fits" button and a tab.', '', ['step-when', 'step-events'], 'Discover is one page again. The steps go.'],
  ['C2', 'Five ways to add busy time', 'Drag on the week, From and Until, "Mark busy" on a free slip, a sentence or the mic, a calendar file, and Google.', '', ['step-when', 'step-when-edit', 'discover-bringin'], 'Done Nov 27. "Mark busy" is off the free slips and the calendar-file button is off the screen. Four ways are left: drag on the week, From and Until, a sentence or the mic, and Google.'],
  ['C3', 'Free time said four times', 'Gold columns in the week, a list of free slips beside them, "13 events fit", and the fit mark on every ticket.', '', ['step-events', 'x-c3'], 'The fit mark stays on every ticket. The note under it gets shorter and keeps its facts: pick the wording at w19 and w20 in Words to fix. The slip list and the count are part of the Discover design round.'],
  ['C4', 'Someday in two places', 'A tab of its own on a laptop, a link inside My Schedule on a phone.', '', ['schedule', 'someday'], 'Done Nov 27. No Someday tab on a laptop either. On every screen it opens from "Someday ideas" at the top of My Schedule.'],
  ['C5', 'Three buttons that undo a filter', 'Discover hides events two ways: by your free time, and by kind (food, sports, arts). 1 "Show all events" turns off the first. 2 "All activities" turns off the second. They look like two buttons for one job, and neither says what it turns off. 3 "Clear busy time" looks like them but erases the busy time you typed.', 'Keep both filters. Each answers a different question: "what fits between my classes?" and "show me every food event, maybe I\'ll move something". Free time becomes a chip in the same row as the kinds, named "Fits my free time", visibly on or off, like the one the Map tab already has. "Clear busy time" moves to My Schedule (your call, Nov 27).', ['x-c5', 'x-c5b']],
  ['C6', 'Who\'s in, three entrances', 'On each free slip, Groups\' "I\'m free, who\'s in?", and sharing your free time.', '', ['step-when', 'groups'], 'Done Nov 27. "Who\'s in?" starts in Groups only. The free slips on Discover have no buttons.'],
  ['C7', 'Leftover food shows in two places', 'It had a block of its own on the first page, "Food left, come now", on top of the "Free food" filter. The app only knows food is left when the host taps "Share leftover food" on their own live event.', '', ['x-c7', 'card-now'], 'Done Nov 27. The block is gone from the first page. The event\'s own ticket says "Food left · 24 min" and leads today\'s list until the 30 minutes run out.'],
  ['C8', 'What you can tap on an opened ticket', '1 the place (opens the map), 2 My day, 3 Walk there, 4 "Let my groups see I\'m going", 5 Plan it. I listed this as a repeat. Looking again, each does its own job and Plan it is clearly the main one.', '', ['x-c8', 'card-now'], '~Keep the ticket as it is. Add a note if you see something to cut.'],
  ['C9', 'My Schedule drawn twice', 'Trail and Tickets are two views of the same plans, with a switch. The week will be a third.', 'Settle this in the same design round as C1: one view of your plans.', ['schedule', 'schedule-tickets', 'step-when']],
  ['C10', 'Stars only in the header', 'Constellation stars sit on the header while the pages stay plain.', '', ['step-events'], 'Yes. A bolder, organic interface with stars in the pages, as its own design round after the cuts.'],
  ['C11', 'Google connect has no screen', 'The import passes 41 tests against a stand-in for Google. The connect button is on no page, and the server has no Google credentials.', '', ['google-today'], 'Yes. "Connect Google Calendar" goes first in setup and in My Schedule. It comes with the setup design round. You add the credentials on the server (docs/GOOGLE_SETUP.md).'],
  ['C13', 'The microphone', 'It uses the browser\'s speech recognition. It has only been tested with a stand-in, never on a real phone, and it cannot run inside these review pages at all.', '', ['discover-bringin'], 'Yes. You test it on a real iPhone or Android phone on the live site. If it fails there, the mic is hidden and typing stays.'],
]
// Word: [key, where, now, proposed ('' means cut), in the app (text | 'KEPT' | 'CUT') once decided]. Keys are saved with her answers: never reuse or renumber one.
const WORDS = [
  ['w1', 'Opened ticket, under the checkbox', 'Your groups see your name. Never where you are.', 'Your groups can see you\'re going.', 'Your groups can see you\'re going.'],
  ['w2', 'Opened ticket, before planning', 'Your groups see your name once you plan it. Never where you are.', 'Plan it to let your groups know.', 'Plan it to let your groups know.'],
  ['w3', 'Map, walking route', 'Location is off, so there is no route. Ricard Observatory is marked on the map.', 'Turn on location to get directions.', 'Turn on location to get directions.'],
  ['w4', 'Map, off campus', 'You\'re off campus. Pick a spot to start from.', 'Choose a starting point.', 'KEPT'],
  ['w5', 'Map and tickets', 'Estimate. Paths not checked on foot.', 'Walking times are estimates.', 'Walking times are estimates.'],
  ['w6', 'Groups, share free time', 'Free or busy only, next 7 days. Never what or where.', 'Shares when you\'re free for the next 7 days.', 'Shares when you\'re free for the next 7 days.'],
  ['w7', 'Groups, before sharing', 'You see when everyone is free once you share yours.', 'Share your free time to see everyone\'s.', 'Share your free time to see everyone\'s.'],
  ['w8', 'Groups', 'Preview only. Nothing is sent.', 'Preview', 'Preview only'],
  ['w9', 'Bring in busy time', 'Typed or spoken words go to our server and an AI reads them.', 'Processed by AI.', 'Processed by AI.'],
  ['w10', 'Bring in busy time, result', 'Read by AI. Check each time before you add it.', 'Review before adding.', 'Review before adding.'],
  ['w11', 'Bring in busy time, mic', 'The microphone is blocked for SideQuest. You can type it instead.', 'Microphone access is off.', 'Microphone access is off.'],
  ['w12', 'Someday', 'Your words go to our server and an AI writes the card.', 'Drafted by AI. Edit before saving.', 'Drafted by AI. Edit before saving.'],
  ['w13', 'Someday, empty', 'Nothing saved yet. Start with an activity you want to remember.', 'No ideas yet', 'Start with an idea you want to remember'],
  ['w14', 'Week heading', 'Mark when you\'re busy. Gold is your free time.', '', 'CUT'],
  ['w15', 'After removing a plan', 'Removed from My Schedule. The original event has not been deleted.', 'Removed from My Schedule', 'Removed from My Schedule'],
  ['w16', 'Host, food shared', 'On Discover for 30 minutes. No alerts sent.', 'Showing on Discover for 30 minutes', 'Showing on Discover for 30 minutes'],
  ['w17', 'AI search', 'Describe what you feel like doing. Your search and public event details are sent to an external AI service.', 'What do you feel like doing? (Uses AI)', 'What do you feel like doing? (Uses AI)'],
  ['w18', 'Foot of every page', 'Posts are saved in this browser only. Dates and times use California time. Personal plans stay on this device.', 'Saved on this device · Pacific Time', 'Saved on this device · Pacific Time'],
  ['w19', 'Ticket note, when you would arrive late', 'Fits, but you\'d arrive 8 min late, walking from Dinner with the Games Society', '8 min late from Dinner with the Games Society'],
  ['w20', 'Ticket note, when you would be late to your next plan', 'Fits, but you\'d be 6 min late to Ceramics Workshop', '6 min late to Ceramics Workshop'],
]
const EDGES = [
  ['tue-night', 'The day is over'], ['mon-early', 'Nothing has started'], ['sat-noon', 'The weekend'], ['nostore', 'A browser that will not save'],
  ['new-schedule', 'New: My Schedule'], ['new-someday', 'New: Someday'], ['new-groups', 'New: Groups'], ['schedule-gone', 'A saved event that is gone'],
  ['step-events-empty', 'Nothing to show'], ['step-events-all', 'Every event'], ['google-removed', 'A Google time removed'], ['step-when-thu', 'Another day opened'],
  ['card-photo-full', 'A photo full screen'], ['post-date', 'Date picker'], ['post-time', 'Time picker'], ['someday-say', 'Say an idea'],
]
// Q&A: [question, [[answer, proof, needs the team's facts?]]]
const QA = [
  ['1. Something you learned from the interviews', [
    ['Plans are about specific friends.', 'Interview 2: making plans was mainly about being with certain people. That is why tickets show friends going and Groups exists.'],
    ['Google Calendar misses real commitments.', 'Interview 2: work and end-of-term obligations were not in the calendar. So busy time can come from Google and also be added by hand.'],
    ['Group decisions take a long time.', 'Interview 1: Snapchat, Discord and calls before anything is settled. Groups shows when everyone is free in one picture.'],
    ['Good ideas get forgotten.', 'Interview 1: places they wanted to try were remembered only after plans were made. Someday keeps an idea until a time fits.'],
    ['"I\'m down" is not a yes.', 'Interview 2. Group answers are Works, If or Cannot, and Plan it is a separate, deliberate tap.'],
    ['What the post-design sessions showed.', 'Add the one or two strongest observations from your usability study here.', true],
  ]],
  ['2. Justify a UX design choice', [
    ['Events are filtered by your free time first.', 'Both interviews start from "when can we". An event you cannot attend is noise, so it is left out and the fit is shown on each ticket.'],
    ['Google time is Google\'s own blue.', 'Students already know that blue. It tells imported time from their own at a glance. White text was checked with APCA contrast.'],
    ['Plans in the week cannot be dragged.', 'An early bar let plans look movable. Now a plan is fixed, and busy time stops at it.'],
    ['Every event is the same ticket.', 'One card shape on Discover, My Schedule, Groups and the map, so nothing has to be relearned. A test checks the type and words match.'],
    ['We removed our own recommendation card.', 'The list already shows only what fits. A second "Our pick" made students choose between two answers to one question.'],
    ['Drop-in events fit with 20 shared minutes.', 'A fair that runs three hours should not be hidden from someone with 45 free minutes. The host chooses "drop in" when posting.'],
  ]],
  ['3. How you used a UX framework', [
    ['W3C cognitive accessibility guidance.', '"Making Content Usable": avoid too much content, keep people on task, do not rely on memory. We audited every flow against it on this page.'],
    ['Nielsen\'s heuristics.', 'User control: every plan and clear has Undo. Error prevention: Post says what is missing next to each field. Consistency: one ticket everywhere.'],
    ['WCAG 2 AA, checked by robots.', 'Automated axe scans run on every screen at phone and laptop size, plus tap targets of 44px and no cut-off text.'],
    ['Goodwin\'s order: research, then requirements, then design.', 'Interviews led to requirements (P1 to P3) before screens. Confirm with the team how closely you followed it.', true],
  ]],
  ['4. A challenge and how you overcame it', [
    ['The AI kept undoing designs we had approved.', 'We wrote approved decisions into the repo, added screenshot tests, and required a before and after at phone and laptop size.'],
    ['Peers stress-tested the shared catalog.', 'One-letter titles, a 2,000-character word, an event in the year 9999. We added limits in the model and the database rule.'],
    ['Two tabs were doing the same job.', 'Discover and My Schedule both drew the week. We mapped every flow with screenshots, found 13 repeats, and cut them one by one.'],
    ['Four people in one codebase.', 'An automatic test fails the build if a view imports the model directly, so Model, View and Controller stay apart.'],
    ['Adding accounts changed the agreed scope.', 'Accounts were outside the agreed scope. Add how the team agreed to change it.', true],
  ]],
  ['5. What you learned from previous prototypes', [
    ['If it looks draggable, people drag it.', 'The first day bar drew plans like busy blocks. They are now paper tickets with a maroon rim that stay put.'],
    ['Real text breaks tidy cards.', 'Peer testing with long titles broke the layout. Tickets now shorten long text and the opened card shows all of it.'],
    ['Fewer controls beat clever ones.', 'Time tags (Now, This afternoon, Tonight) and a date stamp were removed. The day itself is the only control.'],
    ['One long page overwhelms.', 'Discover carried the week, filters, food, a pick and the list. Now it carries the list.'],
    ['Explore wide, keep little.', '136 explored screens were marked Keep, Maybe or Toss before anything was built.'],
  ]],
  ['6. Something you learned from peer feedback', [
    ['Picked and unpicked cards looked alike.', '4 November test. The picked ticket now has a solid stub and stays still.'],
    ['They wanted a shortcut to My Schedule, without being sent there.', 'The toast after planning links to My Schedule. Nothing redirects.'],
    ['The app accepted the year 9999.', 'We capped dates and input length in the model, not only in the form.'],
    ['Show overlaps, do not describe them.', 'Peers asked for a timeline where a longer event is taller. That became the Trail and the clash sheet.'],
    ['We said no to one request.', 'Sideways scrolling on Discover would hide events off-screen. We used denser columns instead, and can say why.'],
  ]],
  ['7. Something you learned about teamwork', [
    ['Everyone owns an area.', 'Design, browsing, posting and data, matching and schedule each have an owner. Working in someone else\'s area starts with telling them.'],
    ['One person merges the shared file at a time.', 'App.tsx is touched by everything, so only one teammate integrates it at once.'],
    ['Write the contract down.', 'The event data contract and the architecture review settled arguments before code did.'],
    ['Reviews and three browsers.', 'Pull requests are reviewed by a teammate, and tests run on Chromium, Firefox and WebKit.'],
    ['A moment that changed how you work together.', 'Add one specific story: a disagreement, a handoff, a late fix.', true],
  ]],
  ['8. How the project changed and evolved', [
    ['From one device to a shared campus.', 'Milestone 1 kept everything on one device. Milestone 2 added the shared catalog. The final adds accounts, groups and Google.'],
    ['From "campus events" to "what fits my time".', 'The interviews were about time and friends, so matching free time became the centre.'],
    ['Discover shrank.', 'A date and time form, then a day bar, then a week, then steps. Now it is the list, and the week lives in My Schedule.'],
    ['It got a look of its own.', 'Plain cards became tickets, stamps and paper, chosen option by option in design rounds.'],
  ]],
  ['9. How you would continue', [
    ['Turn on Google Calendar for real.', 'The server side is built and tested. It needs a connect button on screen and credentials.'],
    ['Test with students we have not talked to.', 'Run flows A to F with an organizer and someone who is usually invited, and time each one.'],
    ['Walk the routes.', 'Campus paths are drawn from map data and labelled as estimates until someone checks them on foot.'],
    ['Finish the cuts.', 'The repeats on this page that are still undecided, and the reworded messages.'],
    ['Bring in real SCU events.', 'By hand for the demo. An automatic import only through a feed the university confirms.'],
  ]],
  ['10. A time you pushed back on what the AI created', [
    ['It added a recommendation card nobody asked for.', '"Our pick", then a one-at-a-time Picks step. We removed both because the list already answers the question.'],
    ['It said white text on Google blue was too faint.', 'It quoted a contrast ratio. We looked at both versions, white was clearly easier to read, and a newer contrast model (APCA) agreed.'],
    ['It called a recolour a redesign.', 'We asked for a new Discover and got the old bar in new colours. Now nothing counts as done until it is visible in the running app.'],
    ['Its messages sounded like a machine.', '"Your groups see your name. Never where you are." We are rewording them the way shipped apps write.'],
    ['It regressed cards we had approved.', 'So we made it record every approved design and added screenshot tests that fail when one changes.'],
  ]],
]
