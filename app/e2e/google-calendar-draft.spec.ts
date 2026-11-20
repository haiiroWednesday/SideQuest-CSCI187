import { expect, test } from '@playwright/test'

test('verified event details expose a California-time Google Calendar draft without calendar access', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.clock.install({ time: new Date('2026-11-20T18:00:00Z') })
  await page.goto('/')
  const id = '11111111-1111-4111-8111-111111111111'
  await page.evaluate(id => localStorage.setItem('sidequest.local-catalog.v1', JSON.stringify([{
    id, title: 'Jazz & Poetry',
    host_name: 'Music Club',
    description: 'A performance for students',
    location: 'Music Hall, SCU',
    event_date: '2026-11-21',
    start_time: '14:30:00',
    end_time: '15:30:00',
  }])), id)
  await page.reload()

  await page.getByRole('button', { name: 'View details for Jazz & Poetry' }).click()
  const dialog = page.getByRole('dialog')
  const link = dialog.getByRole('link', { name: 'Open Google Calendar draft' })
  await expect(link).toBeVisible()
  await expect(link).toHaveAttribute('target', '_blank')
  await expect(link).toHaveAttribute('rel', /noopener noreferrer/)
  const href = await link.getAttribute('href')
  expect(href).toBeTruthy()
  const url = new URL(href!)
  expect(url.origin).toBe('https://calendar.google.com')
  expect(url.searchParams.get('action')).toBe('TEMPLATE')
  expect(url.searchParams.get('dates')).toBe('20261121T223000Z/20261121T233000Z')
  expect(url.searchParams.get('stz')).toBe('America/Los_Angeles')
  expect(url.searchParams.get('text')).toBe('Jazz & Poetry')
  expect(url.searchParams.get('location')).toBe('Music Hall, SCU')

  await dialog.getByRole('button', { name: 'Close details' }).click()
  await page.goto('/#schedule')
  await expect(page.getByText('Nothing planned yet.')).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('sidequest.planned-event-ids.v1'))).toBeNull()
})
