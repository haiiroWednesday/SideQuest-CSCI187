// Known-answer fixtures for the SCU intake. Provenance is marked on each item:
//   live-checked  values read from the public SCU source on Nov 24, 2026 (through a fetch tool; the
//                 workspace network itself cannot reach scu.edu, so the HTML below is rebuilt, not copied)
//   modelled      shaped on the live structure and the read-only audit, with invented IDs
// Nothing here is a full copy of a newsletter or event description.

const s = iso => Date.parse(iso) / 1000

export const SOURCE = { id: 'scu-livewhale', adapter: 'livewhale-v2', page: 'https://events.scu.edu/all',
  feed: 'https://events.scu.edu/live/json/events/' }
export const CHECKED_AT = '2026-11-01T12:00:00.000Z'

/** LiveWhale rows, as the JSON API returns them with response_fields requested. */
export const CALENDAR_ROWS = [
  // live-checked: id, gid, url, start, missing end, place, calendar, types and last_modified.
  { id: 507179, gid: 10, title: "Choreographers' Gallery 2026",
    url: 'https://events.scu.edu/arts-and-sciences/event/507179-choreographers-gallery-2026',
    date_ts: 1796356800, date2_ts: null, is_all_day: null, repeats: null,
    location: 'Louis B. Mayer Theatre', group_title: 'Arts & Sciences',
    event_types: [' Open to the Public', 'Performances'], last_modified: 1790122500, status: 1 },
  // modelled: the audit reports three showtimes with three IDs; only 507179 was re-checked tonight.
  { id: 907180, gid: 10, title: "Choreographers' Gallery 2026",
    url: 'https://events.scu.edu/arts-and-sciences/event/907180-choreographers-gallery-2026',
    date_ts: s('2026-12-04T22:00:00Z'), date2_ts: null, location: 'Louis B. Mayer Theatre', group_title: 'Arts & Sciences' },
  { id: 907181, gid: 10, title: "Choreographers' Gallery 2026",
    url: 'https://events.scu.edu/arts-and-sciences/event/907181-choreographers-gallery-2026',
    date_ts: s('2026-12-05T04:00:00Z'), date2_ts: null, location: 'Louis B. Mayer Theatre', group_title: 'Arts & Sciences' },
  // live-checked link and times from the f26w7 newsletter entry; the calendar row itself is modelled.
  { id: 521456, gid: 4, title: 'Maryanne Wolf: Transformation of Reading in the Age of AI',
    url: 'https://events.scu.edu/provost/event/521456-maryanne-wolf-transformation-of-reading-in-age-of-ai',
    date_ts: s('2026-11-10T03:00:00Z'), date2_ts: s('2026-11-10T04:30:00Z'),
    location: 'Locatelli Center', group_title: 'Office of the Provost' },
  // modelled on the audit: the calendar marks Idea Lab all-day while newsletters give 10 a.m. to 3 p.m.
  { id: 907200, gid: 7, title: 'Bronco Ventures Idea Lab',
    url: 'https://events.scu.edu/engineering/event/907200-bronco-ventures-idea-lab',
    date_ts: s('2026-11-14T08:00:00Z'), date2_ts: null, is_all_day: 1, location: 'SCDI 2302', group_title: 'Bronco Ventures' },
  // modelled on the audit: a WAVE workshop whose newsletter title differs but whose link is this event.
  { id: 907210, gid: 7, title: 'Women in Venture (WAVE): Pitch Your Idea Workshop',
    url: 'https://events.scu.edu/engineering/event/907210-wave-pitch-workshop',
    date_ts: s('2026-11-12T01:00:00Z'), date2_ts: s('2026-11-12T02:30:00Z'), location: 'SCDI 1308', group_title: 'Bronco Ventures' },
  // modelled on the audit: a different Diwali event on the same day as Intandesh's celebration.
  { id: 907220, gid: 12, title: 'Diwali Dance Performance',
    url: 'https://events.scu.edu/event/907220-diwali-dance-performance',
    date_ts: s('2026-11-07T01:30:00Z'), date2_ts: s('2026-11-07T03:00:00Z'), location: 'Mission Gardens', group_title: 'Multicultural Center' },
]

/** Ends offered elsewhere for the showtimes. iCal's are the one-hour default the audit found. */
export const EXTRA_EVIDENCE = [
  { providerId: '507179', field: 'end', source: 'ical-export', value: '21:00' },
  { providerId: '907180', field: 'end', source: 'ical-export', value: '15:00' },
  { providerId: '907181', field: 'end', source: 'ical-export', value: '21:00' },
  // The ticket page gives every show the same 11 p.m. end despite different starts: evidence, not a fact.
  { providerId: '507179', field: 'end', source: 'ticket-page', value: '23:00', passage: 'endDate 23:00' },
  { providerId: '907180', field: 'end', source: 'ticket-page', value: '23:00', passage: 'endDate 23:00' },
  { providerId: '907181', field: 'end', source: 'ticket-page', value: '23:00', passage: 'endDate 23:00' },
]

const entry = (month, day, paragraphs) =>
  `<table><tr><th>${month}</th></tr><tr><td>${day}</td></tr></table>` + paragraphs.map(p => `<p>${p}</p>`).join('')

/** f26w9 rebuilt from its live structure: Extra Bytes announcement tables, then the calendar list. */
export const NEWSLETTER_W9 = {
  issue: { code: 'f26w9', published: '2026-11-16',
    url: 'https://www.scu.edu/email/engineering/graduate-programs/weekly-newsletters/f26w9/' },
  html: `<h1>Extra Bytes</h1>
<table><tr><td><img src="kitchen.png"></td><td><strong>AI Kitchen - Bring Your Product Ideas to Life:</strong><br>
<p>Join us this Friday, November 20, from 1-3 p.m. in the Benson CA Mission Room with Viral Parekh, Founder of Banavu.</p></td></tr></table>
<table><tr><td><img src="ps.png"></td><td><strong>Program of Studies Deadline - Nov. 20:</strong><br>
<p>Your program of studies is due this Friday, November 20.</p></td></tr></table>
<h3>Upcoming Student Events</h3>
${entry('Nov', '20', ['AI Kitchen: Bring Your Product Ideas to Life', '1:00-3:00 p.m. | Benson CA Mission Room',
    'Build a prototype with Adam Smith from OpenAI.'])}
${entry('Dec', '1', ['Global Mobile Advising', '4:00-6:00 p.m. | Heafey Hall Atrium', 'Drop in with questions.'])}
<hr>`,
}

/** f26w7 rebuilt from its live structure. */
export const NEWSLETTER_W7 = {
  issue: { code: 'f26w7', published: '2026-11-02',
    url: 'https://www.scu.edu/email/engineering/graduate-programs/weekly-newsletters/f26w7/' },
  html: `<h3>Upcoming Student Events</h3>
${entry('Nov', '6', ['Intandesh Diwali Celebration', '6:00-9:00 p.m. | SCDI Courtyard', 'Food, dance and lights.',
    '<a href="https://www.instagram.com/p/DfOpmVKz8eO/">More info</a>'])}
${entry('Nov', '9', ['Will Reading and Writing be Transformed in the Age of AI?', '7:00-8:30 p.m. | Locatelli Center',
    'A talk featuring Maryanne Wolf.',
    '<a href="https://events.scu.edu/provost/event/521456-maryanne-wolf-transformation-of-reading-in-age-of-ai">Register</a>'])}
${entry('Nov', '11', ['WAVE Founders Workshop', '5:00-6:30 p.m. | SCDI 1308', 'Pitch practice.', 'In compliance with the ADA/504, please direct your accommodation requests to Priya Shah at pshah@scu.edu.',
    '<a href="https://events.scu.edu/engineering/event/907210-wave-pitch-workshop">Register</a>'])}
${entry('Nov', '14', ['Bronco Ventures Idea Lab', '10:00 a.m. to 3:00 p.m. | SCDI 2302', 'Build with mentors.',
    '<a href="https://share.hsforms.com/19uTleRT_TPmL2fAOHE2plgcbc5l">Register</a>'])}
<hr>`,
}
