import type { CatalogEvent, EventCatalogPort } from '../controller/browseEvents'

function dateAfterDays(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const events: CatalogEvent[] = [
  {
    id: 'preview-art-001',
    title: 'Campus Art Workshop',
    hostName: 'SCU Arts Club',
    description: 'Try a relaxed watercolor activity. Materials are provided; beginners are welcome.',
    location: 'Arts Building, Room 112',
    date: dateAfterDays(2),
    start: '15:00',
    end: '16:30',
  },
  {
    id: 'preview-film-002',
    title: 'Outdoor Film Night',
    hostName: 'Campus Activities Board',
    description: 'Bring a blanket and join students for a movie on the lawn. Snacks available while they last.',
    location: 'St. Ignatius Lawn',
    date: dateAfterDays(3),
    start: '19:00',
    end: '21:00',
  },
  {
    id: 'preview-art-003',
    title: 'Campus Art Workshop',
    hostName: 'Design for America at SCU',
    description: 'Explore a different hands-on project and meet other creative students.',
    location: 'Sobrato Campus for Discovery and Innovation, Room 1300',
    date: dateAfterDays(4),
    start: '12:30',
    end: '14:00',
  },
]

export const browsePreviewCatalog: EventCatalogPort = {
  async listUpcoming() {
    return events
      .filter(event => event.date >= dateAfterDays(0))
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start))
  },
  async getById(id) {
    return events.find(event => event.id === id) ?? null
  },
}
