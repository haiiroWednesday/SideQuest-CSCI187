// TEST FIXTURES for the scenario lab only. These events are not a catalog and
// never reach browser storage. Dates are written relative to a base day so each scenario
// stays meaningful whatever the real date is.
import type { ScreenEvent } from '../controller/presentScreens'
import { createScheduleController, type ScheduleResult } from '../controller/personalSchedule'
import { PLANNED_IDS_KEY } from '../model/schedule'

export type Scenario = {
  id: string
  label: string
  /** YYYY-MM-DD the clock starts on */
  base: string
  /** minutes after midnight the clock starts at */
  startAt: number
  events: ScreenEvent[]
  planned: string[]
  /** planned IDs whose events are gone from the catalog */
  missing: string[]
  error?: string
  loading?: boolean
}

export function shiftDate(base: string, days: number): string {
  const [y, m, d] = base.split('-').map(Number)
  const value = new Date(y, m - 1, d + days)
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}

const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
const E = (base: string, id: string, title: string, hostName: string | undefined, location: string, day: number, start: string, end: string, description?: string): ScreenEvent =>
  ({ id, title, hostName, location, date: shiftDate(base, day), start, end, description })

function busyWeek(base: string): ScreenEvent[] {
  return [
    E(base, 'climb', 'Climbing Club Intro', 'SCU Climbing Club', 'Malley Center', 0, '12:30', '13:30', 'Harnesses provided. Wear shoes you can move in.'),
    E(base, 'ceramics', 'Ceramics Workshop', 'SCU Ceramics Club', 'Arts Building', 0, '14:30', '15:30', 'Try wheel-throwing and hand-building. Clay and aprons provided.'),
    E(base, 'poetry', 'Poetry Reading', undefined, 'Library', 0, '15:00', '16:00', 'An afternoon of student-written poetry.'),
    E(base, 'choir', 'Chamber Choir Open Rehearsal', 'Department of Music', 'Music Building', 0, '18:45', '19:45', 'Sit in on a rehearsal of the fall program.'),
    E(base, 'study', 'Study Jam', 'Learning Commons', 'Library, 2nd floor', 1, '15:00', '17:00', 'Quiet tables, snacks at four, tutors for intro CS and calculus.'),
    E(base, 'mic', 'Open Mic Night', 'Bronco Music Collective', 'Benson Center patio', 1, '19:00', '21:00', 'Sign up at the door for a five-minute slot.'),
    E(base, 'studio-a', 'Open Studio Evening', 'Studio Art Collective', 'Studio 12', 3, '17:00', '18:30', 'Bring a sketchbook. Easels and charcoal on hand.'),
    E(base, 'studio-b', 'Open Studio Evening', 'Printmaking Club', 'Arts Building 108', 3, '19:00', '20:30', 'Linocut and screen-print stations, ink provided.'),
  ]
}

/** A seeded week of believable campus events, so every Shuffle is new but repeatable. */
export function randomWeek(base: string, seed: number): ScreenEvent[] {
  let s = seed || 1
  const r = (k: number) => { s = (s * 16807) % 2147483647; return s % k }
  const what = ['Board Game Night', 'Resume Review', 'Salsa Basics', 'Sunrise Run', 'Robotics Demo', 'Film Club: Ozu Double Bill', 'Bake Sale', 'Chess Blitz', 'Mandarin Table', 'Late-Night Pancakes', 'Pottery Wheel Drop-in', 'Hackathon Kickoff', 'Acapella Auditions', 'Trivia', 'Garden Workday']
  const who = ['Tabletop Club', 'Career Center', 'Dance Collective', 'Running Club', 'Robotics Team', 'Film Society', undefined, 'Chess Club', 'Chinese Student Association', 'Residence Life', undefined, 'ACM Chapter', 'Acapella Council', 'Honors Program', 'Sustainability Club']
  const where = ['Benson Center, Room 21', 'Learning Commons', 'Malley Center', 'Mission Gardens', 'Engineering Building 326', 'Fess Parker Studio', 'Library lawn', 'Swig Hall lounge', 'Arts Building', 'Kennedy Mall']
  return Array.from({ length: 6 + r(9) }, (_, i) => {
    const k = r(what.length)
    const start = (7 + r(15)) * 60 + [0, 15, 30, 45][r(4)]
    const end = Math.min(start + 30 + r(6) * 30, 23 * 60 + 59)
    return E(base, `rand-${seed}-${i}`, what[k], who[k], where[r(where.length)], r(9), hhmm(start), hhmm(end), r(3) ? 'Drop in any time; no sign-up needed.' : undefined)
  })
}

export function scenarios(today: string, seed: number): Scenario[] {
  return [
    { id: 'busy', label: 'Busy week', base: today, startAt: 13 * 60, events: busyWeek(today), planned: ['ceramics', 'poetry', 'mic'], missing: ['gone-41'] },
    {
      id: 'now', label: 'Happening now', base: today, startAt: 14 * 60 + 40, planned: ['ceramics', 'trivia'], missing: [],
      events: [
        E(today, 'run', 'Sunrise Run', 'Running Club', 'Malley Center', 0, '07:00', '08:00'),
        E(today, 'ceramics', 'Ceramics Workshop', 'SCU Ceramics Club', 'Arts Building', 0, '14:30', '15:30', 'Clay and aprons provided.'),
        E(today, 'trivia', 'Trivia', 'Honors Program', 'Swig Hall lounge', 0, '15:00', '16:00'),
        E(today, 'pancakes', 'Late-Night Pancakes', 'Residence Life', 'Benson Center', 0, '22:30', '23:59'),
      ],
    },
    {
      id: 'quiet', label: 'Quiet month', base: today, startAt: 10 * 60, planned: ['far'], missing: [],
      events: [
        E(today, 'nine', 'Hackathon Kickoff', 'ACM Chapter', 'Engineering Building 326', 9, '18:00', '20:00'),
        E(today, 'far', 'Winter Concert', 'Department of Music', 'Mission Church', 30, '19:30', '21:00'),
      ],
    },
    {
      id: 'newyear', label: "New Year's Eve", base: '2026-12-31', startAt: 20 * 60, planned: ['countdown', 'brunch'], missing: [],
      events: [
        E('2026-12-31', 'countdown', 'Countdown on the Lawn', 'Residence Life', 'Kennedy Mall', 0, '22:00', '23:59'),
        E('2026-12-31', 'brunch', 'New Year Brunch', undefined, 'Benson Center', 1, '10:00', '12:00'),
        E('2026-12-31', 'early', 'Midnight Skate', 'Skate Club', 'Malley Center', 1, '00:00', '01:30'),
      ],
    },
    {
      id: 'messy', label: 'Messy data', base: today, startAt: 9 * 60, planned: ['dup-b'], missing: ['old-1', 'old-2'],
      events: [
        E(today, 'long', 'Intro to Computational Musicology: Reading Chopin Mazurkas With Python, Pandas and a Very Patient Piano', undefined, 'Music Building, Room 112 (the one behind the practice rooms)', 0, '16:00', '17:45'),
        E(today, 'dup-b', 'Open Studio Evening', 'Printmaking Club', 'Arts Building 108', 2, '19:00', '20:30'),
        E(today, 'dup-a', 'Open Studio Evening', 'Studio Art Collective', 'Studio 12', 2, '19:00', '20:30'),
        E(today, 'tiny', 'Chess Blitz', 'Chess Club', 'Library', 1, '12:00', '12:15'),
        E(today, 'midnight', 'Stargazing', 'Astronomy Club', 'Ricard Observatory', 1, '23:00', '23:59'),
      ],
    },
    {
      id: 'packed', label: 'Packed day', base: today, startAt: 9 * 60, planned: ['long', 'talk', 'concert', 'dinner'], missing: [],
      events: [
        E(today, 'long', 'Long Workshop: Intro to Printmaking', 'Printmaking Club', 'Arts Building 108', 0, '13:00', '17:00'),
        E(today, 'talk', 'Career Talk', 'Career Center', 'Learning Commons', 0, '14:00', '15:00'),
        E(today, 'concert', 'Jazz Combo Concert', 'Department of Music', 'Music Building', 0, '16:30', '18:00'),
        E(today, 'dinner', 'Club Dinner', 'Tabletop Club', 'Benson Center', 0, '18:00', '19:00'),
      ],
    },
    { id: 'random', label: 'Random week', base: today, startAt: 11 * 60, events: randomWeek(today, seed), planned: [], missing: [] },
    { id: 'loading', label: 'Still loading', base: today, startAt: 12 * 60, events: [], planned: [], missing: [], loading: true },
    { id: 'empty', label: 'Nothing posted', base: today, startAt: 12 * 60, events: [], planned: [], missing: [] },
    { id: 'down', label: 'Catalog down', base: today, startAt: 12 * 60, events: [], planned: [], missing: [], error: 'The event list did not respond. Check your connection and try again.' },
  ]
}

/**
 * My Schedule from Sembiyan's real Schedule controller, over the scenario's
 * events, with plan IDs kept in memory instead of localStorage. Missing IDs are
 * written straight into that memory, the way an event that later left the
 * catalog would still sit in a student's saved plans.
 */
export function scheduleFromController(catalog: readonly ScreenEvent[], ids: readonly string[], missing: readonly string[]): ScheduleResult {
  const memory = new Map<string, string>([[PLANNED_IDS_KEY, JSON.stringify([...ids, ...missing])]])
  const storage = { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => void memory.set(key, value) }
  return createScheduleController([...catalog], () => storage).read()
}
