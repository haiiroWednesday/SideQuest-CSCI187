import { expect, test, type Page } from '@playwright/test'

// Sembiyan: full-fit search -> plan -> separate chronological Schedule -> remove.
// Pages: Post an event (#post), Discover (/), My Schedule (#schedule).
const nav = (page: Page) => page.getByRole('navigation', { name: 'SideQuest primary' })

test('availability and personal Schedule work across navigation and reload', async ({ page }) => {
  await page.goto('/')
  const dates = await page.evaluate(() => {
    const date = new Date()
    date.setDate(date.getDate() + 7)
    const iso = (value: Date) => [value.getFullYear(), String(value.getMonth() + 1).padStart(2, '0'), String(value.getDate()).padStart(2, '0')].join('-')
    const first = iso(date)
    date.setDate(date.getDate() + 1)
    return [first, iso(date)]
  })
  // Use the real posting form so this fails if Discover still reads the M1 list.
  const form = page.locator('.event-form')
  const post = async (title: string, date: string, start: string, end: string) => {
    await form.getByLabel('EVENT NAME', { exact: true }).fill(title)
    await form.getByLabel('HOST NAME', { exact: true }).fill('SCU student club')
    await form.getByLabel('DESCRIPTION', { exact: true }).fill('Open to all students.')
    await form.getByLabel('LOCATION', { exact: true }).fill('Student Center')
    await form.getByLabel('DATE', { exact: true }).fill(date)
    await form.getByLabel('START', { exact: true }).fill(start)
    await form.getByLabel('END', { exact: true }).fill(end)
    await form.getByRole('button', { name: '+ Post event' }).click()
    await expect(page.getByRole('status').filter({ hasText: `Posted “${title}”` })).toBeVisible()
  }
  await nav(page).getByRole('link', { name: 'My Schedule', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Nothing planned yet.' })).toBeVisible()
  await nav(page).getByRole('link', { name: /Post an event/ }).click()
  await post('Tomorrow concert', dates[1], '14:30', '15:30')
  await post('Early workshop', dates[0], '14:30', '15:30')
  await post('Choir overlap', dates[0], '15:00', '16:00')
  await post('Starts at window end', dates[0], '16:00', '17:00')
  await expect(page.getByRole('region', { name: /posted events/i }).getByText('Starts at window end')).toBeVisible()
  // Posted events can be planned from the Post page even when no search is set.
  await page.getByRole('button', { name: 'Plan to attend Tomorrow concert', exact: true }).click()

  await nav(page).getByRole('link', { name: 'Discover', exact: true }).click()
  const free = page.getByRole('search', { name: 'When are you free?' })
  await free.getByLabel('Free on').fill(dates[0])
  await free.getByLabel('from').fill('14:00')
  await free.getByLabel('until').fill('16:00')
  await expect(page.getByText('2 events fit', { exact: false })).toBeVisible()
  await expect(page.getByRole('button', { name: 'View details for Starts at window end' })).toHaveCount(0)
  const ticket = page.getByRole('complementary')
  const plan = async (title: string) => {
    await page.getByRole('button', { name: `View details for ${title}` }).click()
    await expect(ticket.getByRole('heading', { name: title })).toBeVisible()
    await ticket.getByRole('button', { name: '+ Plan to attend' }).click()
    await expect(ticket.getByRole('button', { name: 'In My Schedule' })).toBeDisabled()
  }
  await plan('Early workshop')
  await plan('Choir overlap')
  await expect(page.getByText(/Schedule overlap:.*Choir overlap/)).toBeVisible()

  await nav(page).getByRole('link', { name: /My Schedule/ }).click()
  const stubs = page.getByRole('button', { name: /^View details for / })
  await expect(stubs.first()).toBeVisible()
  const titles = () => stubs.evaluateAll(els => els.map(el => el.getAttribute('aria-label')!.replace('View details for ', '')))
  expect(await titles()).toEqual(['Early workshop', 'Choir overlap', 'Tomorrow concert'])
  await expect(page.getByText('2 plans overlap')).toBeVisible()
  await expect(ticket.getByText('Overlaps 1 plan')).toBeVisible()
  await page.screenshot({ path: test.info().outputPath('schedule-desktop.png'), fullPage: true })
  await page.reload()
  await expect(ticket.getByRole('heading', { name: 'Early workshop' })).toBeVisible()
  expect(await titles()).toEqual(['Early workshop', 'Choir overlap', 'Tomorrow concert'])
  await page.getByRole('button', { name: 'Remove Early workshop from plans', exact: true }).click()
  await expect(page.getByRole('button', { name: 'View details for Early workshop' })).toHaveCount(0)
  expect(await titles()).toEqual(['Choir overlap', 'Tomorrow concert'])
  await expect(page.getByText(/plans overlap/)).toHaveCount(0)

  await nav(page).getByRole('link', { name: 'Discover', exact: true }).click()
  await page.getByRole('button', { name: 'View details for Early workshop' }).click()
  await expect(ticket.getByRole('button', { name: '+ Plan to attend' })).toBeEnabled()
  const stored = await page.evaluate(() => ({
    catalog: JSON.parse(localStorage.getItem('sidequest.local-catalog.v1')!),
    plans: JSON.parse(localStorage.getItem('sidequest.planned-event-ids.v1')!),
  }))
  expect(stored.catalog).toHaveLength(4)
  expect(stored.plans).toHaveLength(2)
  expect(stored.plans.every((id: unknown) => typeof id === 'string')).toBe(true)
})

test('phone Schedule keeps overlaps, long names and unavailable events readable', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')
  await page.evaluate(() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    const date = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-')
    const a = '00000000-0000-4000-8000-000000000001'
    const b = '00000000-0000-4000-8000-000000000002'
    const common = { host_name: 'SCU student club', description: 'Open to all.', event_date: date }
    const records = [
      { ...common, id: a, title: 'Campus photography and creative storytelling workshop', location: 'Student Center', start_time: '14:30:00', end_time: '15:30:00' },
      { ...common, id: b, title: 'Choir rehearsal', location: 'Music Hall', start_time: '15:00:00', end_time: '16:00:00' },
    ]
    localStorage.setItem('sidequest.local-catalog.v1', JSON.stringify(records))
    localStorage.setItem('sidequest.planned-event-ids.v1', JSON.stringify([b, 'missing', a]))
  })
  await page.goto('/#schedule')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'My Schedule.' })).toBeVisible()
  await expect(page.getByText('2 plans overlap')).toBeVisible()
  await expect(page.getByText('An event you planned')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: test.info().outputPath('schedule-phone.png'), fullPage: true })
  await page.getByRole('button', { name: 'Remove unavailable event missing from plans' }).click()
  await expect(page.getByText('An event you planned')).toHaveCount(0)
  const planned = page.locator('.sq-stats div').filter({ hasText: 'planned' }).first()
  await expect(planned.locator('dd')).toHaveText('2')
})
