// TEST FIXTURES for the scenario lab only. These are not a catalog and never
// reach storage. Dates are written relative to a base day so each scenario
// stays meaningful whatever the real date is.
import { createScheduleController } from '../controller/personalSchedule'
import type { ScheduleInput, ScreenEvent } from '../controller/presentScreens'

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

function formatScenarioTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

type ScenarioEventDetails = {
  id: string
  title: string
  hostName?: string
  location: string
  dayOffset: number
  start: string
  end: string
  description?: string
}

function createScenarioEvent(baseDate: string, details: ScenarioEventDetails): ScreenEvent {
  return {
    id: details.id,
    title: details.title,
    hostName: details.hostName,
    location: details.location,
    date: shiftDate(baseDate, details.dayOffset),
    start: details.start,
    end: details.end,
    description: details.description,
  }
}

function busyWeek(base: string): ScreenEvent[] {
  return [
    createScenarioEvent(base, {
      id: 'climb',
      title: 'Climbing Club Intro',
      hostName: 'SCU Climbing Club',
      location: 'Malley Center',
      dayOffset: 0,
      start: '12:30',
      end: '13:30',
      description: 'Harnesses provided. Wear shoes you can move in.',
    }),
    createScenarioEvent(base, {
      id: 'ceramics',
      title: 'Ceramics Workshop',
      hostName: 'SCU Ceramics Club',
      location: 'Arts Building',
      dayOffset: 0,
      start: '14:30',
      end: '15:30',
      description: 'Try wheel-throwing and hand-building. Clay and aprons provided.',
    }),
    createScenarioEvent(base, {
      id: 'poetry',
      title: 'Poetry Reading',
      hostName: undefined,
      location: 'Library',
      dayOffset: 0,
      start: '15:00',
      end: '16:00',
      description: 'An afternoon of student-written poetry.',
    }),
    createScenarioEvent(base, {
      id: 'choir',
      title: 'Chamber Choir Open Rehearsal',
      hostName: 'Department of Music',
      location: 'Music Building',
      dayOffset: 0,
      start: '18:45',
      end: '19:45',
      description: 'Sit in on a rehearsal of the fall program.',
    }),
    createScenarioEvent(base, {
      id: 'study',
      title: 'Study Jam',
      hostName: 'Learning Commons',
      location: 'Library, 2nd floor',
      dayOffset: 1,
      start: '15:00',
      end: '17:00',
      description: 'Quiet tables, snacks at four, tutors for intro CS and calculus.',
    }),
    createScenarioEvent(base, {
      id: 'mic',
      title: 'Open Mic Night',
      hostName: 'Bronco Music Collective',
      location: 'Benson Center patio',
      dayOffset: 1,
      start: '19:00',
      end: '21:00',
      description: 'Sign up at the door for a five-minute slot.',
    }),
    createScenarioEvent(base, {
      id: 'studio-a',
      title: 'Open Studio Evening',
      hostName: 'Studio Art Collective',
      location: 'Studio 12',
      dayOffset: 3,
      start: '17:00',
      end: '18:30',
      description: 'Bring a sketchbook. Easels and charcoal on hand.',
    }),
    createScenarioEvent(base, {
      id: 'studio-b',
      title: 'Open Studio Evening',
      hostName: 'Printmaking Club',
      location: 'Arts Building 108',
      dayOffset: 3,
      start: '19:00',
      end: '20:30',
      description: 'Linocut and screen-print stations, ink provided.',
    }),
  ]
}

// Park-Miller constants keep seeded lab scenarios repeatable across browsers.
const RANDOM_MULTIPLIER = 16_807
const RANDOM_MODULUS = 2_147_483_647
const START_MINUTE_OFFSETS = [0, 15, 30, 45] as const

/** A seeded week of believable campus events, so every Shuffle is new but repeatable. */
export function randomWeek(base: string, seed: number): ScreenEvent[] {
  let randomState = seed || 1
  const randomIndex = (upperBound: number) => {
    randomState = (randomState * RANDOM_MULTIPLIER) % RANDOM_MODULUS
    return randomState % upperBound
  }
  const eventTitles = [
    'Board Game Night',
    'Resume Review',
    'Salsa Basics',
    'Sunrise Run',
    'Robotics Demo',
    'Film Club: Ozu Double Bill',
    'Bake Sale',
    'Chess Blitz',
    'Mandarin Table',
    'Late-Night Pancakes',
    'Pottery Wheel Drop-in',
    'Hackathon Kickoff',
    'Acapella Auditions',
    'Trivia',
    'Garden Workday',
  ]
  const eventHosts = [
    'Tabletop Club',
    'Career Center',
    'Dance Collective',
    'Running Club',
    'Robotics Team',
    'Film Society',
    undefined,
    'Chess Club',
    'Chinese Student Association',
    'Residence Life',
    undefined,
    'ACM Chapter',
    'Acapella Council',
    'Honors Program',
    'Sustainability Club',
  ]
  const eventLocations = [
    'Benson Center, Room 21',
    'Learning Commons',
    'Malley Center',
    'Mission Gardens',
    'Engineering Building 326',
    'Fess Parker Studio',
    'Library lawn',
    'Swig Hall lounge',
    'Arts Building',
    'Kennedy Mall',
  ]
  return Array.from({ length: 6 + randomIndex(9) }, (_, i) => {
    const eventIndex = randomIndex(eventTitles.length)
    const startHour = 7 + randomIndex(15)
    const minuteOffset = START_MINUTE_OFFSETS[randomIndex(START_MINUTE_OFFSETS.length)]
    const start = startHour * 60 + minuteOffset
    const end = Math.min(start + 30 + randomIndex(6) * 30, 23 * 60 + 59)
    return createScenarioEvent(base, {
      id: `rand-${seed}-${i}`,
      title: eventTitles[eventIndex],
      hostName: eventHosts[eventIndex],
      location: eventLocations[randomIndex(eventLocations.length)],
      dayOffset: randomIndex(9),
      start: formatScenarioTime(start),
      end: formatScenarioTime(end),
      description: randomIndex(3) ? 'Drop in any time; no sign-up needed.' : undefined,
    })
  })
}

export function scenarios(today: string, seed: number): Scenario[] {
  return [
    {
      id: 'busy',
      label: 'Busy week',
      base: today,
      startAt: 13 * 60,
      events: busyWeek(today),
      planned: ['ceramics', 'poetry', 'mic'],
      missing: ['gone-41'],
    },
    {
      id: 'now',
      label: 'Happening now',
      base: today,
      startAt: 14 * 60 + 40,
      planned: ['ceramics', 'trivia'],
      missing: [],
      events: [
        createScenarioEvent(today, {
          id: 'run',
          title: 'Sunrise Run',
          hostName: 'Running Club',
          location: 'Malley Center',
          dayOffset: 0,
          start: '07:00',
          end: '08:00',
        }),
        createScenarioEvent(today, {
          id: 'ceramics',
          title: 'Ceramics Workshop',
          hostName: 'SCU Ceramics Club',
          location: 'Arts Building',
          dayOffset: 0,
          start: '14:30',
          end: '15:30',
          description: 'Clay and aprons provided.',
        }),
        createScenarioEvent(today, {
          id: 'trivia',
          title: 'Trivia',
          hostName: 'Honors Program',
          location: 'Swig Hall lounge',
          dayOffset: 0,
          start: '15:00',
          end: '16:00',
        }),
        createScenarioEvent(today, {
          id: 'pancakes',
          title: 'Late-Night Pancakes',
          hostName: 'Residence Life',
          location: 'Benson Center',
          dayOffset: 0,
          start: '22:30',
          end: '23:59',
        }),
      ],
    },
    {
      id: 'quiet',
      label: 'Quiet month',
      base: today,
      startAt: 10 * 60,
      planned: ['far'],
      missing: [],
      events: [
        createScenarioEvent(today, {
          id: 'nine',
          title: 'Hackathon Kickoff',
          hostName: 'ACM Chapter',
          location: 'Engineering Building 326',
          dayOffset: 9,
          start: '18:00',
          end: '20:00',
        }),
        createScenarioEvent(today, {
          id: 'far',
          title: 'Winter Concert',
          hostName: 'Department of Music',
          location: 'Mission Church',
          dayOffset: 30,
          start: '19:30',
          end: '21:00',
        }),
      ],
    },
    {
      id: 'newyear',
      label: "New Year's Eve",
      base: '2026-12-31',
      startAt: 20 * 60,
      planned: ['countdown', 'brunch'],
      missing: [],
      events: [
        createScenarioEvent('2026-12-31', {
          id: 'countdown',
          title: 'Countdown on the Lawn',
          hostName: 'Residence Life',
          location: 'Kennedy Mall',
          dayOffset: 0,
          start: '22:00',
          end: '23:59',
        }),
        createScenarioEvent('2026-12-31', {
          id: 'brunch',
          title: 'New Year Brunch',
          hostName: undefined,
          location: 'Benson Center',
          dayOffset: 1,
          start: '10:00',
          end: '12:00',
        }),
        createScenarioEvent('2026-12-31', {
          id: 'early',
          title: 'Midnight Skate',
          hostName: 'Skate Club',
          location: 'Malley Center',
          dayOffset: 1,
          start: '00:00',
          end: '01:30',
        }),
      ],
    },
    {
      id: 'messy',
      label: 'Messy data',
      base: today,
      startAt: 9 * 60,
      planned: ['dup-b'],
      missing: ['old-1', 'old-2'],
      events: [
        createScenarioEvent(today, {
          id: 'long',
          title:
            'Intro to Computational Musicology: Reading Chopin Mazurkas With Python, Pandas and a Very Patient Piano',
          hostName: undefined,
          location: 'Music Building, Room 112 (the one behind the practice rooms)',
          dayOffset: 0,
          start: '16:00',
          end: '17:45',
        }),
        createScenarioEvent(today, {
          id: 'dup-b',
          title: 'Open Studio Evening',
          hostName: 'Printmaking Club',
          location: 'Arts Building 108',
          dayOffset: 2,
          start: '19:00',
          end: '20:30',
        }),
        createScenarioEvent(today, {
          id: 'dup-a',
          title: 'Open Studio Evening',
          hostName: 'Studio Art Collective',
          location: 'Studio 12',
          dayOffset: 2,
          start: '19:00',
          end: '20:30',
        }),
        createScenarioEvent(today, {
          id: 'tiny',
          title: 'Chess Blitz',
          hostName: 'Chess Club',
          location: 'Library',
          dayOffset: 1,
          start: '12:00',
          end: '12:15',
        }),
        createScenarioEvent(today, {
          id: 'midnight',
          title: 'Stargazing',
          hostName: 'Astronomy Club',
          location: 'Ricard Observatory',
          dayOffset: 1,
          start: '23:00',
          end: '23:59',
        }),
      ],
    },
    {
      id: 'random',
      label: 'Random week',
      base: today,
      startAt: 11 * 60,
      events: randomWeek(today, seed),
      planned: [],
      missing: [],
    },
    {
      id: 'loading',
      label: 'Still loading',
      base: today,
      startAt: 12 * 60,
      events: [],
      planned: [],
      missing: [],
      loading: true,
    },
    {
      id: 'empty',
      label: 'Nothing posted',
      base: today,
      startAt: 12 * 60,
      events: [],
      planned: [],
      missing: [],
    },
    {
      id: 'down',
      label: 'Catalog down',
      base: today,
      startAt: 12 * 60,
      events: [],
      planned: [],
      missing: [],
      error: 'The event list did not respond. Check your connection and try again.',
    },
  ]
}

/** In-memory lab storage only; use the real Schedule controller for conflicts. */
export function scheduleFixture(
  catalog: readonly ScreenEvent[],
  ids: readonly string[],
  missing: readonly string[],
): ScheduleInput {
  const storage = { getItem: () => JSON.stringify([...ids, ...missing]), setItem: () => {} }
  return createScheduleController(catalog, () => storage).read().schedule
}
