// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { browsePreviewCatalog } from '../src/dev/browsePreviewCatalog'
import App from '../src/App'

const originalPath = window.location.pathname
afterEach(() => {
  cleanup()
  window.history.replaceState({}, '', originalPath)
  window.localStorage.clear()
})

function todayLocal(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

describe('development browse preview catalog', () => {
  it('lists realistic upcoming records in date and time order', async () => {
    const events = await browsePreviewCatalog.listUpcoming()

    expect(events.length).toBeGreaterThanOrEqual(3)
    expect(events.map(event => event.id)).toEqual([
      'preview-art-001',
      'preview-film-002',
      'preview-art-003',
    ])
    expect(events.every(event =>
      event.date >= todayLocal() &&
      event.id && event.title && event.hostName && event.description &&
      event.location && event.start < event.end,
    )).toBe(true)
  })

  it('retrieves same-title events independently by their stable IDs', async () => {
    const events = await browsePreviewCatalog.listUpcoming()
    const sameTitle = events.filter(event => event.title === 'Campus Art Workshop')

    expect(sameTitle).toHaveLength(2)
    expect(sameTitle[0].id).not.toBe(sameTitle[1].id)
    expect(await browsePreviewCatalog.getById(sameTitle[1].id)).toEqual(sameTitle[1])
    expect(await browsePreviewCatalog.getById('unknown-preview-id')).toBeNull()
  })

  it('enables the development preview from its query parameter and opens the selected ID', async () => {
    window.history.replaceState({}, '', '/?browsePreview=1')
    render(<App />)

    expect(await screen.findByText('Development preview: mock catalog data.')).toBeTruthy()
    const cards = await screen.findAllByRole('button', { name: /View details for Campus Art Workshop/ })
    expect(cards).toHaveLength(2)
    await userEvent.click(screen.getByRole('button', { name: 'View details for Campus Art Workshop (preview-art-003)' }))
    expect(await screen.findByText('Explore a different hands-on project and meet other creative students.')).toBeTruthy()
  })
})
