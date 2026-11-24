import { useEffect, useState } from 'react'
// DEMO ENTRY (not the shipped app): the real App on a browser-local catalog,
// seeded with a sample week so My Schedule has something to show.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { LOCAL_CATALOG_KEY, createBrowserEventTable } from './model/browserEventTable'
import { createEventCatalog } from './model/eventCatalog'
import { PLANNED_IDS_KEY } from './model/schedule'
import { todayLocalISO } from './model/events'
import { DISCOVER_LAYOUT_KEY } from './controller/viewPreferences'
import { POSTED_IDS_KEY } from './controller/myPosts'
import './style.css'
import './view/look/fonts'
import { LookPanel, applyLook } from './view/look/LookPanel'
import { readLook } from './controller/lookPreferences'

const SEED_KEY = 'sidequest.demo-seed.v6'
const uid = (i: number) => `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`
const day = (offset: number) => { const d = new Date(); d.setDate(d.getDate() + offset); return todayLocalISO(d) }
type Row = [number, string, string, string, string, string, boolean]
// [day offset, start, end, title, host, location, planned]
const ROWS: Row[] = [
  [0, '09:00', '09:15', 'Club fair sign-up', 'ASG', 'Benson lawn', true],
  [0, '10:00', '12:00', 'Study Jam', 'Learning Commons', 'Library, 2nd floor', true],
  [0, '10:00', '11:00', 'Ceramics Workshop', 'Ceramics Club', 'Dowd 104', true],
  [0, '10:30', '11:30', 'Poetry Reading', 'Poetry Club', 'Library', true],
  [0, '13:00', '17:00', 'Bronco Hackathon', 'ACM', 'SCDI 1308', true],
  [0, '13:30', '14:30', 'Climbing Club Intro', 'Climbing Club', 'Malley Center', true],
  [0, '15:00', '16:00', 'Choir Open Rehearsal', 'Chamber Singers', 'Music and Dance Building', true],
  [0, '17:00', '18:00', 'Dinner with the Games Society', 'Games Society', 'Benson', true],
  [0, '21:00', '23:00', 'Open Mic Night', 'Poetry Club', 'Benson Center patio', true],
  [0, '19:00', '20:30', 'Stargazing at Ricard', 'Astronomy Club', 'Ricard Observatory', false],
  [0, '18:30', '20:00', 'Open Studio Evening', 'Printmaking Club', 'Dowd Art Building', false],
  [1, '10:00', '11:00', 'Office hours: Data Structures', 'CSEN', 'SCDI 2nd floor', true],
  [1, '13:00', '14:30', 'Figure drawing', 'Art Club', 'Dowd Art Building', true],
  [1, '17:00', '18:00', 'Boba run', 'Chinese Student Association', 'Palm Drive', true],
  [2, '09:30', '11:00', 'Brunch club', 'Hospitality Society', 'Mission Gardens', true],
  [2, '14:00', '16:00', 'Garden shift', 'Forge Garden', 'Forge Garden', true],
  [2, '21:00', '22:30', 'Film night', 'Film Society', 'Fess Parker Studio Theatre', true],
  [3, '11:00', '12:00', 'Python lab', 'ACM', 'SCDI 1302', true],
  [3, '11:30', '12:30', 'Choir sectional', 'Chamber Singers', 'Music and Dance Building', true],
  [3, '16:00', '17:00', 'Board games', 'Games Society', 'Benson Lounge', true],
  [4, '12:00', '13:00', 'Lunch talk on climate', 'Environmental Studies', 'Kenna Hall', true],
  [4, '15:00', '18:00', 'Hack night', 'ACM', 'SCDI 1308', true],
  [4, '16:00', '17:00', 'Climbing', 'Climbing Club', 'Malley Center', true],
  [1, '18:00', '19:30', 'Mindfulness walk', 'Wellness Center', 'Mission Gardens', false],
  [2, '12:00', '13:00', 'Volunteer fair', 'Ignatian Center', 'Locatelli Center', false],
  // Real SCU listings from the reviewed event-intake branch, moved onto this week.
  [1, "10:30", "11:30", "Farm Stand: Student Hour", "SCU Sustainability", "The Forge Garden", false],
  [2, "11:00", "12:30", "Preserving Your Fall Harvest: Persimmon Jam", "SCU Sustainability", "The Forge Garden", false],
  [0, "19:00", "19:45", "LGBTQ+ Affinity Night Reception", "SCU Theatre and Dance", "Fess Lobby, SCU Performing Arts", false],
  [0, "18:30", "19:30", "Slices of Religious Life", "SCU Mission and Ministry", "Nobili Dining Room", false],
  [1, "11:00", "16:00", "Bucky's Closet Thrift Store", "SCU Sustainability", "Daly Science 317/318", false],
  [0, "18:00", "19:00", "Nourish Nights", "SCU Sustainability", "The Forge Garden", false],
  [2, "13:00", "14:00", "Glean Team", "SCU Sustainability", "The Forge Garden", false],
  [3, "17:00", "19:00", "Youth Environmental Justice Community Organizing Exchange", "SCU Mission and Ministry", "Williman Room, Benson Memorial Center", false],
  [4, "15:00", "17:00", "Ignatian Family Teach-In for Justice Watch Party", "SCU Mission and Ministry", "Center for Spirituality and Faith, Benson 105", false],
  [4, "11:45", "12:50", "Signs of the Times: Solidarity and Social Justice Panel", "SCU Mission and Ministry", "Forbes, Lucas Hall", false],
]
try {
  if (localStorage.getItem(SEED_KEY) !== day(0)) {
    const rows = ROWS.map(([d, start, end, title, host, location], i) => ({
      id: uid(i), title, host_name: host, description: `${title}, hosted by ${host}. Sample data for the design review.`,
      location, event_date: day(d), start_time: `${start}:00`, end_time: `${end}:00`,
    }))
    localStorage.setItem(LOCAL_CATALOG_KEY, JSON.stringify(rows))
    localStorage.setItem(PLANNED_IDS_KEY, JSON.stringify(ROWS.flatMap((r, i) => r[6] ? [uid(i)] : [])))
    // Two sample events you posted yourself: Stargazing and the Volunteer fair.
    localStorage.setItem(POSTED_IDS_KEY, JSON.stringify([uid(9), uid(24)]))
    localStorage.setItem(SEED_KEY, day(0))
  }
  // The review starts on the flip cards; the switch on Discover changes it.
  // Round five picks: cards flip down like a postcard.
if (localStorage.getItem('sidequest.demo-layout-pick') !== 'flip-down') { localStorage.setItem(DISCOVER_LAYOUT_KEY, 'flip-down'); localStorage.setItem('sidequest.demo-layout-pick', 'flip-down') }
} catch { /* storage blocked: the app shows its own empty state */ }

if (!location.hash) location.hash = '#discover'
const now = () => { const d = new Date(); d.setHours(10, 40, 0, 0); return d }
const root = document.getElementById('root')
if (!root) throw new Error('Root element missing')
// The demo clock is fixed at 10:40 today, for the catalog and the screens alike.
const catalog = { catalog: createEventCatalog(createBrowserEventTable(localStorage), now), shared: false }
document.documentElement.dataset.sqMotion = 'review'
applyLook(readLook())
document.documentElement.dataset.quiet = '1'
// The Look panel is for us, not for people using the app (Nov 24): hidden unless ?look is in the
// address or Shift+L is pressed. Saved looks still apply either way.
function LookWhenAsked() {
  const [on, setOn] = useState(() => new URLSearchParams(location.search).has('look'))
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.shiftKey && e.key.toLowerCase() === 'l' && !(e.target as HTMLElement)?.closest?.('input, textarea, select')) setOn(v => !v) }
    addEventListener('keydown', key); return () => removeEventListener('keydown', key)
  }, [])
  return on ? <LookPanel /> : null
}
createRoot(root).render(<StrictMode><App catalog={catalog} now={now} designReview /><LookWhenAsked /></StrictMode>)
