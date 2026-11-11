import { expect, test, type Page, type Locator } from '@playwright/test'
import { audit } from './helpers/uiAudit'

// Issue #36 (https://github.com/haiiroWednesday/SideQuest-CSCI187/issues/36), run by machine: every case that needs no special server fixture and no human judgment.
// Each test is named by its case ID, leaves a screenshot at test-results/qa36/<ID>.png, and also
// runs the layout audit (sideways scroll, touching or covered controls, misused red, repeated messages).
// Cases that need a person (U01–U04, comparing two screenshots) or a fixture this app can't fake
// are listed at the end as skipped with the reason.

// About six minutes of browser time, so it runs on demand (npm run test:qa36) rather than on every push.
test.skip(!process.env.SIDEQUEST_QA36, 'Run with npm run test:qa36')

const CAMPUS_NOON = new Date('2026-11-11T20:00:00Z') // Wed 11 Nov 2026, 12:00 California
const SEED = [
  ['QA A – Art Workshop', 'SideQuest QA', 'Paint together', 'Benson 101', '2026-12-04', '14:30', '15:30'],
  ['QA B – Club Fair', 'SideQuest QA', 'Meet clubs', 'Benson 102', '2026-12-04', '16:00', '17:00'],
  ['QA C – Board Games', 'SideQuest QA', 'Play games', 'Benson 103', '2026-12-04', '14:45', '16:15'],
  ['QA D – Jazz Meetup', 'SideQuest QA', 'Listen to jazz', 'Music 201', '2026-12-05', '11:00', '12:00'],
] as const
const A = SEED[0][0], B = SEED[1][0], C = SEED[2][0], D = SEED[3][0]
const FIELDS = ['EVENT NAME', 'HOST NAME', 'DESCRIPTION', 'LOCATION', 'DATE', 'START', 'END'] as const
const BASE = ['QA Validation', 'SideQuest QA', 'Test', 'Benson 101', '2026-12-04', '12:00', '13:00']
const CATALOG_KEY = 'sidequest.local-catalog.v1'

let seeded: string | null = null // A–D as the app itself stored them, captured once per worker

async function open(page: Page, hash = '#discover', size?: [number, number]) {
  if (size) await page.setViewportSize({ width: size[0], height: size[1] })
  await page.goto('/' + hash)
  await dismissToasts(page)
}
/** The "not connected" notice sits over the bottom of a phone screen for a few seconds; a tester would close it. */
async function dismissToasts(page: Page) {
  for (const close of await page.locator('.sq-toasts').getByRole('button', { name: /dismiss|close/i }).all()) await close.click().catch(() => {})
}

async function postViaForm(page: Page, values: readonly string[]) {
  await page.goto('/#post')
  const form = page.locator('.event-form')
  for (let i = 0; i < FIELDS.length; i++) await form.getByLabel(FIELDS[i], { exact: true }).fill(values[i])
  await form.getByRole('button', { name: '+ Post event' }).click()
  await expect(page.getByText(`Posted “${values[0]}”`)).toBeVisible()
}

/** SEEDED: A–D posted one by one through the real form (first time), then replayed from storage. */
async function seed(page: Page) {
  if (!seeded) {
    await page.goto('/')
    for (const row of SEED) await postViaForm(page, row)
    seeded = await page.evaluate(key => localStorage.getItem(key), CATALOG_KEY)
    return
  }
  await page.addInitScript(([key, value]) => {
    if (!sessionStorage.getItem('qa-seeded')) { localStorage.setItem(key, value); sessionStorage.setItem('qa-seeded', '1') }
  }, [CATALOG_KEY, seeded] as const)
}

const cards = (page: Page) => page.getByRole('button', { name: /^View details for / })
async function cardTitles(page: Page) {
  return (await cards(page).evaluateAll(els => els.map(el => el.getAttribute('aria-label')!.replace('View details for ', ''))))
}
const card = (page: Page, title: string) => page.getByRole('button', { name: `View details for ${title}` })
const fit = (page: Page) => page.locator('.sq-free-count')
const details = (page: Page) => page.locator('aside.sq-sticker')

async function setWindow(page: Page, date = '', start = '', end = '') {
  const clear = page.getByRole('button', { name: '✕ Clear' })
  if (await clear.isVisible()) await clear.click()
  if (date) await page.getByLabel('Free on', { exact: true }).fill(date)
  if (start) await page.getByLabel('from', { exact: true }).fill(start)
  if (end) await page.getByLabel('until', { exact: true }).fill(end)
}

async function plan(page: Page, title: string) {
  await page.goto('/#discover'); await page.reload(); await dismissToasts(page)
  await card(page, title).click()
  await details(page).getByRole('button', { name: '+ Plan to attend' }).click()
  await expect(details(page).getByRole('button', { name: /In My Schedule/ })).toBeVisible()
  await page.keyboard.press('Escape'); await dismissToasts(page)
}

async function finish(page: Page, id: string, { strict = true } = {}) {
  const findings = await audit(page, `test-results/qa36/${id}.png`)
  if (strict) expect(findings, `${id} layout audit:\n${findings.join('\n')}`).toEqual([])
  else if (findings.length) test.info().annotations.push({ type: 'layout', description: findings.join(' | ') })
}

const postForm = (page: Page) => page.locator('.event-form')
async function fillPost(page: Page, overrides: Partial<Record<typeof FIELDS[number], string>> = {}) {
  await page.goto('/#post')
  for (let i = 0; i < FIELDS.length; i++) {
    const value = overrides[FIELDS[i]] ?? BASE[i]
    await postForm(page).getByLabel(FIELDS[i], { exact: true }).fill(value)
  }
}
const submit = (page: Page) => postForm(page).getByRole('button', { name: '+ Post event' }).click()
const fieldError = (page: Page, field: string) => page.locator(`#post-${field}-error`)
async function catalogSize(page: Page) {
  return page.evaluate(key => { try { const v = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(v) ? v.length : (v.rows?.length ?? v.events?.length ?? Object.keys(v).length) } catch { return -1 } }, CATALOG_KEY)
}

test.beforeEach(async ({ page }) => {
  test.setTimeout(90_000)
  await page.clock.install({ time: CAMPUS_NOON })
})
test.describe.configure({ mode: 'parallel' })

// ---------------- A. Empty website ----------------
test('E01 empty Discover', async ({ page }) => {
  await open(page)
  await expect(page.getByText('No events to show yet.')).toBeVisible()
  await expect(cards(page)).toHaveCount(0)
  await expect(page.getByRole('link', { name: /Post an event/ }).first()).toBeVisible()
  await finish(page, 'E01')
})
test('E02 empty My Schedule', async ({ page }) => {
  await open(page, '#schedule')
  await expect(page.getByText('Nothing planned yet.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Browse Discover' })).toBeVisible()
  await finish(page, 'E02')
})
test('E03 Browse Discover goes to Discover', async ({ page }) => {
  await open(page, '#schedule')
  await page.getByRole('link', { name: 'Browse Discover' }).click()
  await expect(page.locator('a[aria-current="page"]')).toHaveText(/Discover/)
  await expect(page.getByText('No events to show yet.')).toBeVisible()
  await finish(page, 'E03')
})
test('E04 date only on an empty site', async ({ page }) => {
  await open(page); await setWindow(page, '2026-12-04')
  // "Showing all upcoming events" would contradict an empty site, so the hint waits until there are events.
  await expect(page.locator('#sq-free-hint')).toHaveCount(0)
  await expect(page.getByText('No events to show yet.')).toBeVisible()
  await finish(page, 'E04')
})
test('E05 full window on an empty site does not imply events failed to match', async ({ page }) => {
  await open(page); await setWindow(page, '2026-12-04', '14:30', '15:30')
  await expect(page.getByText('No events fit this window.')).toHaveCount(0)
  await expect(page.getByText('No events to show yet.')).toBeVisible()
  await finish(page, 'E05')
})
test('E06 clearing returns the empty catalog', async ({ page }) => {
  await open(page); await setWindow(page, '2026-12-04', '14:30', '15:30')
  const showAll = page.getByRole('button', { name: 'Show all events' })
  if (await showAll.isVisible()) await showAll.click(); else await page.getByRole('button', { name: '✕ Clear' }).click()
  for (const l of ['Free on', 'from', 'until']) await expect(page.getByLabel(l, { exact: true })).toHaveValue('')
  await expect(page.getByText('No events to show yet.')).toBeVisible()
  await finish(page, 'E06')
})
test('E07 Post from the empty Discover page', async ({ page }) => {
  await open(page)
  await page.locator('main').getByRole('link', { name: /Post an event|Post something/ }).first().click()
    .catch(async () => page.getByRole('link', { name: /Post an event/ }).first().click())
  await expect(postForm(page)).toBeVisible()
  await finish(page, 'E07')
})
test('E08 blank post shows errors and creates nothing', async ({ page }) => {
  await open(page, '#post'); await submit(page)
  for (const f of ['title', 'hostName', 'description', 'location']) await expect(fieldError(page, f)).toBeVisible()
  await page.goto('/#discover'); await expect(cards(page)).toHaveCount(0)
  await finish(page, 'E08')
})

// ---------------- B. Free-time filter ----------------
const ALL = [A, C, B, D]
const F: [string, string, string, string, string[] | 'error', string | null, string?][] = [
  ['F01', '', '', '', ALL, null],
  ['F02', '2026-12-04', '', '', ALL, null, 'hint'],
  ['F03', '', '14:30', '', ALL, null, 'hint'],
  ['F04', '', '', '15:30', ALL, null, 'hint'],
  ['F05', '2026-12-04', '14:30', '', ALL, null, 'hint'],
  ['F06', '2026-12-04', '', '15:30', ALL, null, 'hint'],
  ['F07', '', '14:30', '15:30', ALL, null, 'hint'],
  ['F08', '2026-12-04', '14:30', '15:30', [A], '1 fit'],
  ['F09', '2026-12-04', '14:30', '15:29', [], null],
  ['F10', '2026-12-04', '14:31', '15:30', [], null],
  ['F11', '2026-12-04', '14:31', '15:29', [], null],
  ['F12', '2026-12-04', '14:30', '16:15', [A, C], '2 fit'],
  ['F13', '2026-12-04', '14:00', '17:00', [A, C, B], '3 fit'],
  ['F14', '2026-12-04', '14:45', '16:15', [C], '1 fit'],
  ['F15', '2026-12-04', '16:00', '17:00', [B], '1 fit'],
  ['F16', '2026-12-05', '11:00', '12:00', [D], '1 fit'],
  ['F17', '2026-12-04', '11:00', '12:00', [], null],
  ['F18', '2026-12-04', '15:30', '16:00', [], null],
  ['F19', '2026-12-04', '15:00', '15:45', [], null],
  ['F20', '2026-12-04', '00:00', '23:59', [A, C, B], '3 fit'],
  ['F21', '2026-12-06', '14:00', '17:00', [], null],
  ['F22', '2026-12-04', '15:00', '15:00', 'error', null],
  ['F23', '2026-12-04', '17:00', '14:00', 'error', null],
  ['F32', '2026-12-05', '10:59', '12:00', [D], '1 fit'],
  ['F33', '2026-12-05', '11:00', '11:59', [], null],
]
for (const [id, d, s, e, want, count, extra] of F) {
  test(`${id} filter ${d || '—'} ${s || '—'}–${e || '—'}`, async ({ page }) => {
    await seed(page); await open(page); await setWindow(page, d, s, e)
    if (want === 'error') {
      await expect(page.locator('#sq-free-error')).toBeVisible()
    } else {
      await expect.poll(() => cardTitles(page)).toEqual(want)
      if (count) await expect(fit(page)).toHaveText(count)
      if (want.length === 0) {
        await expect(page.getByText('No events fit this window.')).toBeVisible()
        await expect(page.getByRole('button', { name: 'Show all events' })).toBeVisible()
        await expect(page.locator('main').getByRole('link', { name: 'Post an event' })).toBeVisible()
        await expect(details(page).getByRole('button', { name: /Plan to attend/ })).toHaveCount(0)
      }
      if (extra === 'hint') await expect(page.locator('#sq-free-hint')).toBeVisible()
    }
    await finish(page, id)
  })
}
test('F24 Show all events clears everything', async ({ page }) => {
  await seed(page); await open(page); await setWindow(page, '2026-12-04', '14:31', '15:29')
  await page.getByRole('button', { name: 'Show all events' }).click()
  for (const l of ['Free on', 'from', 'until']) await expect(page.getByLabel(l, { exact: true })).toHaveValue('')
  await expect.poll(() => cardTitles(page)).toEqual(ALL)
  await finish(page, 'F24')
})
test('F25 Clear removes a lone date and its hint', async ({ page }) => {
  await seed(page); await open(page); await setWindow(page, '2026-12-04')
  await page.getByRole('button', { name: '✕ Clear' }).click()
  await expect(page.getByLabel('Free on', { exact: true })).toHaveValue('')
  await expect(page.locator('#sq-free-hint')).toHaveCount(0)
  await finish(page, 'F25')
})
test('F26 widening one end at a time', async ({ page }) => {
  await seed(page); await open(page); await setWindow(page, '2026-12-04', '14:31', '15:29')
  await expect.poll(() => cardTitles(page)).toEqual([])
  await page.getByLabel('until', { exact: true }).fill('15:30'); await expect.poll(() => cardTitles(page)).toEqual([])
  await page.getByLabel('from', { exact: true }).fill('14:30'); await expect.poll(() => cardTitles(page)).toEqual([A])
  await expect(fit(page)).toHaveText('1 fit')
  await finish(page, 'F26')
})
test('F27 narrowing replaces results with the no-match note', async ({ page }) => {
  await seed(page); await open(page); await setWindow(page, '2026-12-04', '14:30', '15:30')
  await expect.poll(() => cardTitles(page)).toEqual([A])
  await page.getByLabel('until', { exact: true }).fill('15:29')
  await expect(page.getByText('No events fit this window.')).toBeVisible()
  await expect(cards(page)).toHaveCount(0)
  await finish(page, 'F27')
})
test('F28 a filled, correct field does not look like an error', async ({ page }) => {
  await seed(page); await open(page); await setWindow(page, '2026-12-04')
  await finish(page, 'F28') // the audit fails on any valid field drawn in red
})
test('F29 zero matches does not look like an invalid field', async ({ page }) => {
  await seed(page); await open(page); await setWindow(page, '2026-12-04', '14:31', '15:29')
  await expect(page.locator('[aria-invalid="true"]')).toHaveCount(0)
  await expect(page.getByText('Nothing fits')).toHaveCount(0)
  await finish(page, 'F29')
})
test('F30 changing the date drops a stale selection', async ({ page }) => {
  await seed(page); await open(page); await setWindow(page, '2026-12-04', '14:30', '15:30')
  await card(page, A).click(); await expect(details(page)).toContainText('Paint together')
  await page.getByLabel('Free on', { exact: true }).fill('2026-12-05')
  await expect(details(page)).not.toContainText('Paint together')
  await expect(details(page).getByRole('button', { name: /Plan to attend/ })).toHaveCount(0)
  await finish(page, 'F30')
})
test('F31 flipping until three times shows only the latest result', async ({ page }) => {
  await seed(page); await open(page); await setWindow(page, '2026-12-04', '14:30', '15:30')
  for (let i = 0; i < 3; i++) {
    await page.getByLabel('until', { exact: true }).fill('15:29'); await expect.poll(() => cardTitles(page)).toEqual([])
    await page.getByLabel('until', { exact: true }).fill('15:30'); await expect.poll(() => cardTitles(page)).toEqual([A])
  }
  await expect(fit(page)).toHaveText('1 fit')
  await finish(page, 'F31')
})

// ---------------- C. Cards and details ----------------
const R: [string, string, string[]][] = [
  ['R01', A, ['SideQuest QA', 'Benson 101', 'Paint together', '2:30']],
  ['R02', B, ['Benson 102', 'Meet clubs', '4:00']],
  ['R03', C, ['Benson 103', 'Play games', '2:45']],
  ['R04', D, ['Music 201', 'Listen to jazz', '11:00']],
]
for (const [id, title, bits] of R) {
  test(`${id} details for ${title}`, async ({ page }) => {
    await seed(page); await open(page); await card(page, title).click()
    await expect(details(page)).toContainText(title)
    for (const bit of bits) await expect(details(page)).toContainText(bit)
    await finish(page, id)
  })
}
test('R05 fast clicking ends on the last card', async ({ page }) => {
  await seed(page); await open(page)
  await card(page, A).click(); await card(page, C).click(); await card(page, B).click()
  await expect(details(page)).toContainText(B); await expect(details(page)).not.toContainText(A)
  await finish(page, 'R05')
})
test('R06 Post something opens Post', async ({ page }) => {
  await seed(page); await open(page)
  const link = page.getByRole('link', { name: /Post something/ })
  await expect(link.locator('.sq-pen-arrow')).toBeVisible()
  await link.click(); await expect(postForm(page)).toBeVisible()
  await finish(page, 'R06')
})
test('R07 planning A gives one success and flips the button', async ({ page }) => {
  await seed(page); await open(page); await card(page, A).click()
  await details(page).getByRole('button', { name: '+ Plan to attend' }).click()
  await expect(details(page).getByRole('button', { name: /In My Schedule/ })).toBeVisible()
  await expect(page.locator('.sq-toasts [role="status"], .sq-toasts [role="alert"]')).toHaveCount(1)
  await finish(page, 'R07', { strict: false })
})
test('R08 a planned event is plainly already planned', async ({ page }) => {
  await seed(page); await plan(page, A); await page.reload(); await card(page, A).click()
  await expect(details(page).getByRole('button', { name: /In My Schedule/ })).toBeDisabled()
  await finish(page, 'R08', { strict: false })
})
test('R09 filtering after selecting A drops A', async ({ page }) => {
  await seed(page); await open(page); await card(page, A).click()
  await setWindow(page, '2026-12-04', '16:00', '17:00')
  await expect.poll(() => cardTitles(page)).toEqual([B])
  await expect(details(page)).not.toContainText('Paint together')
  await finish(page, 'R09')
})
test('R10 phone sheet opens with everything readable', async ({ page }) => {
  await seed(page); await open(page, '#discover', [375, 812]); await card(page, A).click()
  await expect(details(page)).toHaveClass(/sq-open/)
  for (const name of ['Close details', '+ Plan to attend']) await expect(details(page).getByRole('button', { name })).toBeVisible()
  await expect(details(page)).toContainText('Paint together')
  await finish(page, 'R10')
})
test('R11 phone sheet closes with ×', async ({ page }) => {
  await seed(page); await open(page, '#discover', [375, 812]); await card(page, A).click()
  await details(page).getByRole('button', { name: 'Close details' }).click()
  await expect(details(page)).not.toHaveClass(/sq-open/)
  await card(page, C).click(); await expect(details(page)).toContainText(C)
  await finish(page, 'R11')
})
test('R12 phone sheet closes on the shaded space', async ({ page }) => {
  await seed(page); await open(page, '#discover', [375, 812]); await card(page, A).click()
  await page.mouse.click(187, 60)
  await expect(details(page)).not.toHaveClass(/sq-open/)
  await finish(page, 'R12')
})
test('R13 Escape closes the phone sheet and returns focus to A', async ({ page }) => {
  await seed(page); await open(page, '#discover', [375, 812]); await card(page, A).click()
  await page.keyboard.press('Escape')
  await expect(details(page)).not.toHaveClass(/sq-open/)
  await expect(card(page, A)).toBeFocused()
  await finish(page, 'R13')
})
test('R14 Tab to A and press Enter', async ({ page }) => {
  await seed(page); await open(page)
  await card(page, A).focus(); await page.keyboard.press('Enter')
  await expect(details(page)).toContainText('Paint together')
  const ring = await card(page, A).evaluate(el => { const s = getComputedStyle(el); return s.outlineStyle !== 'none' || s.boxShadow !== 'none' })
  expect(ring).toBe(true)
  await finish(page, 'R14')
})
const LONG_TITLE = 'QA Long Title ' + 'W'.repeat(90)
test('R15 a 104-character title wraps', async ({ page }) => {
  await seed(page); await postViaForm(page, [LONG_TITLE, 'SideQuest QA', 'Long title test', 'Benson 201', '2026-12-05', '13:00', '14:00'])
  await page.goto('/#discover'); await card(page, LONG_TITLE).click()
  await expect(details(page)).toContainText('Long title test')
  await finish(page, 'R15')
})
test('R16 a long description stays readable', async ({ page }) => {
  await seed(page); await postViaForm(page, ['QA Long Description', 'SideQuest QA', 'Art and music at SCU. '.repeat(60).trim(), 'Benson 202', '2026-12-05', '15:00', '16:00'])
  await page.goto('/#discover'); await card(page, 'QA Long Description').click()
  await expect(details(page).getByRole('button', { name: '+ Plan to attend' })).toBeVisible()
  await finish(page, 'R16')
})
test('R17 Chinese and emoji', async ({ page }) => {
  await seed(page); await postViaForm(page, ['书法工作坊 🎨', '艺术社', '欢迎参加！', 'Benson 203', '2026-12-05', '16:30', '17:30'])
  await page.goto('/#discover'); await card(page, '书法工作坊 🎨').click()
  await expect(details(page)).toContainText('艺术社'); await expect(details(page)).toContainText('欢迎参加！')
  await finish(page, 'R17')
})
test('R18 long description on a short phone', async ({ page }) => {
  await seed(page); await postViaForm(page, ['QA Long Description', 'SideQuest QA', 'Art and music at SCU. '.repeat(60).trim(), 'Benson 202', '2026-12-05', '15:00', '16:00'])
  await open(page, '#discover', [375, 568]); await card(page, 'QA Long Description').click()
  const planBtn = details(page).getByRole('button', { name: '+ Plan to attend' })
  await planBtn.scrollIntoViewIfNeeded(); await expect(planBtn).toBeInViewport()
  await expect(details(page).getByRole('button', { name: 'Close details' })).toBeVisible()
  await finish(page, 'R18')
})

// ---------------- D. Posting ----------------
const P: [string, Partial<Record<typeof FIELDS[number], string>>, string[]][] = [
  ['P01', { 'EVENT NAME': '', 'HOST NAME': '', DESCRIPTION: '', LOCATION: '' }, ['title', 'hostName', 'description', 'location']],
  ['P02', { 'EVENT NAME': 'QA Incomplete', 'HOST NAME': '', DESCRIPTION: '', LOCATION: '' }, ['hostName', 'description', 'location']],
  ['P03', { 'HOST NAME': '' }, ['hostName']],
  ['P04', { DESCRIPTION: '' }, ['description']],
  ['P05', { LOCATION: '' }, ['location']],
  ['P06', { 'EVENT NAME': '   ' }, ['title']],
  ['P07', { 'HOST NAME': '   ' }, ['hostName']],
  ['P08', { DESCRIPTION: '   ' }, ['description']],
  ['P09', { LOCATION: '   ' }, ['location']],
  ['P10', { DATE: '' }, ['date']],
  ['P11', { START: '' }, ['start']],
  ['P12', { END: '' }, ['end']],
  ['P13', { START: '14:30', END: '14:30' }, ['end']],
  ['P14', { START: '17:00', END: '14:00' }, ['end']],
  ['P15', { DATE: '2026-11-11', START: '00:00', END: '00:30' }, ['start']],
]
for (const [id, overrides, errs] of P) {
  test(`${id} posting rejects ${errs.join(', ')}`, async ({ page }) => {
    await seed(page); await page.goto('/'); const before = await catalogSize(page)
    await fillPost(page, overrides); await submit(page)
    for (const e of errs) await expect(fieldError(page, e), `${e} error`).toBeVisible()
    await expect(page.getByText(/^Posted “/)).toHaveCount(0)
    expect(await catalogSize(page)).toBe(before)
    await finish(page, id)
  })
}
test('P16 a blurred empty title errors, then clears', async ({ page }) => {
  await seed(page); await page.goto('/#post')
  const title = postForm(page).getByLabel('EVENT NAME', { exact: true }), host = postForm(page).getByLabel('HOST NAME', { exact: true })
  await title.fill('QA Correction'); await host.click(); await title.fill(''); await host.click()
  await expect(fieldError(page, 'title')).toBeVisible()
  await title.fill('QA Corrected'); await host.click()
  await expect(fieldError(page, 'title')).toHaveCount(0)
  await finish(page, 'P16')
})
test('P17 a time error clears once fixed', async ({ page }) => {
  await seed(page); await fillPost(page, { START: '17:00', END: '14:00' })
  await postForm(page).getByLabel('HOST NAME', { exact: true }).click()
  await postForm(page).getByLabel('START', { exact: true }).fill('13:00')
  await postForm(page).getByLabel('HOST NAME', { exact: true }).click()
  await expect(fieldError(page, 'end')).toHaveCount(0); await expect(fieldError(page, 'start')).toHaveCount(0)
  await finish(page, 'P17')
})
test('P18 valid title is not red; focused host is distinct', async ({ page }) => {
  await seed(page); await page.goto('/#post')
  await postForm(page).getByLabel('EVENT NAME', { exact: true }).fill('QA Visual Check')
  const host = postForm(page).getByLabel('HOST NAME', { exact: true }); await host.focus()
  const [plain, focused] = await Promise.all([postForm(page).getByLabel('DESCRIPTION', { exact: true }), host].map(l => l.evaluate(el => getComputedStyle(el).borderTopColor + getComputedStyle(el).boxShadow)))
  expect(focused).not.toBe(plain)
  await finish(page, 'P18')
})
test('P19 title stops at 120 characters', async ({ page }) => {
  await seed(page); await page.goto('/#post')
  const title = postForm(page).getByLabel('EVENT NAME', { exact: true }); await title.focus()
  await page.keyboard.insertText('A'.repeat(130))
  expect((await title.inputValue()).length).toBe(120)
  await finish(page, 'P19')
})
test('P20 a 1,400-character description fits', async ({ page }) => {
  await seed(page); await fillPost(page, { DESCRIPTION: 'Music is fun. '.repeat(100) })
  await finish(page, 'P20')
})
test('P21 + P22 one success, then the right fields reset', async ({ page }) => {
  await seed(page); await fillPost(page, { 'EVENT NAME': 'QA Success 1', DATE: '2026-12-05' }); await submit(page)
  await expect(page.getByText('Posted “QA Success 1”')).toBeVisible()
  await expect(page.getByText(/saved in this browser only/).first()).toBeVisible()
  await finish(page, 'P21')
  for (const f of ['EVENT NAME', 'DESCRIPTION', 'LOCATION']) await expect(postForm(page).getByLabel(f, { exact: true })).toHaveValue('')
  await expect(postForm(page).getByLabel('HOST NAME', { exact: true })).toHaveValue('SideQuest QA')
  await expect(postForm(page).getByLabel('DATE', { exact: true })).toHaveValue('2026-12-05')
  await finish(page, 'P22')
  await page.goto('/#discover'); await expect(card(page, 'QA Success 1')).toBeVisible()
})
test('P23 double-click posts once', async ({ page }) => {
  await seed(page); await fillPost(page, { 'EVENT NAME': 'QA Double Click', DATE: '2026-12-05', START: '13:15', END: '14:15' })
  await postForm(page).getByRole('button', { name: '+ Post event' }).dblclick()
  await expect(page.getByText('Posted “QA Double Click”')).toBeVisible()
  await page.goto('/#discover'); await expect(card(page, 'QA Double Click')).toHaveCount(1)
  await finish(page, 'P23')
})
test('P24 Chinese and emoji post', async ({ page }) => {
  await seed(page); await fillPost(page, { 'EVENT NAME': '社团活动 🎨', 'HOST NAME': '艺术社', DESCRIPTION: '欢迎参加', DATE: '2026-12-05', START: '18:00', END: '19:00' }); await submit(page)
  await page.goto('/#discover'); await expect(card(page, '社团活动 🎨')).toBeVisible()
  await finish(page, 'P24')
})
test('P25 every field and the button are reachable on a phone', async ({ page }) => {
  await seed(page); await page.setViewportSize({ width: 375, height: 812 }); await fillPost(page)
  const btn = postForm(page).getByRole('button', { name: '+ Post event' })
  await btn.scrollIntoViewIfNeeded(); await expect(btn).toBeInViewport()
  await finish(page, 'P25')
})

// ---------------- E. My Schedule ----------------
const schedule = (page: Page) => page.locator('main')
async function scheduleTitles(page: Page) {
  // The Next Up card repeats the first plan's Remove button, so titles are counted once.
  return page.getByRole('button', { name: /^Remove .* from plans$/ }).evaluateAll(els => [...new Set(els.map(el => el.getAttribute('aria-label')!.replace(/^Remove | from plans$/g, '')))])
}
test('S01 empty schedule', async ({ page }) => {
  await seed(page); await open(page, '#schedule')
  await expect(page.getByText('Nothing planned yet.')).toBeVisible()
  await finish(page, 'S01')
})
const S: [string, string[], (page: Page) => Promise<void>][] = [
  ['S02', [A], async p => { await expect(schedule(p)).toContainText('Benson 101') }],
  ['S03', [A, C], async p => { await expect(schedule(p)).toContainText('by 45 min') }],
  ['S04', [C, B], async p => { await expect(schedule(p)).toContainText('by 15 min') }],
  ['S05', [A, B], async p => { await expect(p.locator('.sq-pill-overlap')).toHaveCount(0) }],
  ['S06', [A, D], async p => { await expect(p.locator('.sq-day')).toHaveCount(2); await expect(p.locator('.sq-pill-overlap')).toHaveCount(0) }],
  ['S07', [A, B, C, D], async p => { expect((await scheduleTitles(p)).length).toBe(4) }],
  ['S15', [D], async p => { await expect(schedule(p)).toContainText('11:00') }],
  ['S16', [A, C, D], async p => { await expect(p.locator('.sq-pill-overlap')).toHaveCount(2) }],
]
for (const [id, titles, check] of S) {
  test(`${id} schedule with ${titles.length} plan(s)`, async ({ page }) => {
    await seed(page); for (const t of titles) await plan(page, t)
    await page.goto('/#schedule')
    await expect.poll(async () => (await scheduleTitles(page)).sort()).toEqual([...titles].sort())
    await check(page)
    await finish(page, id)
  })
}
test('S08 + S20 removing A empties the schedule and A stays on Discover', async ({ page }) => {
  await seed(page); await plan(page, A); await page.goto('/#schedule')
  await page.getByRole('button', { name: `Remove ${A} from plans` }).first().click()
  await expect(page.getByText('Nothing planned yet.')).toBeVisible()
  await finish(page, 'S08', { strict: false })
  await page.goto('/#discover'); await card(page, A).click()
  await expect(details(page).getByRole('button', { name: '+ Plan to attend' })).toBeEnabled()
  await finish(page, 'S20', { strict: false })
})
test('S09 removing C clears the overlap', async ({ page }) => {
  await seed(page); await plan(page, A); await plan(page, C); await page.goto('/#schedule')
  await page.getByRole('button', { name: `Remove ${C} from plans` }).first().click()
  await expect.poll(() => scheduleTitles(page)).toEqual([A])
  await expect(page.locator('.sq-pill-overlap')).toHaveCount(0)
  await finish(page, 'S09', { strict: false })
})
test('S10 removing A makes C next up', async ({ page }) => {
  await seed(page); await plan(page, A); await plan(page, C); await page.goto('/#schedule')
  await page.getByRole('button', { name: `Remove ${A} from plans` }).first().click()
  await expect.poll(() => scheduleTitles(page)).toEqual([C])
  await finish(page, 'S10', { strict: false })
})
test('S11 a plan survives reload', async ({ page }) => {
  await seed(page); await plan(page, A); await page.goto('/#schedule'); await page.reload()
  await expect.poll(() => scheduleTitles(page)).toEqual([A]); await expect(schedule(page)).toContainText('Benson 101')
  await finish(page, 'S11')
})
test('S12 + S14 planned state, then plannable again after removal', async ({ page }) => {
  await seed(page); await plan(page, A); await page.goto('/#discover'); await card(page, A).click()
  await expect(details(page).getByRole('button', { name: /In My Schedule/ })).toBeDisabled()
  await finish(page, 'S12', { strict: false })
  await page.goto('/#schedule'); await page.getByRole('button', { name: `Remove ${A} from plans` }).first().click()
  await page.goto('/#discover'); await card(page, A).click()
  await expect(details(page).getByRole('button', { name: '+ Plan to attend' })).toBeEnabled()
  await finish(page, 'S14', { strict: false })
})
test('S13 switching tabs never duplicates', async ({ page }) => {
  await seed(page); await plan(page, A); await plan(page, B)
  for (let i = 0; i < 3; i++) { await page.goto('/#discover'); await page.goto('/#schedule') }
  await expect.poll(async () => (await scheduleTitles(page)).sort()).toEqual([A, B].sort())
  await finish(page, 'S13')
})
test('S17 a second tab hears about a removal', async ({ page, context }) => {
  await seed(page); await plan(page, A)
  const second = await context.newPage(); await second.goto('/#schedule')
  await expect.poll(() => scheduleTitles(second)).toEqual([A])
  await page.goto('/#schedule'); await page.getByRole('button', { name: `Remove ${A} from plans` }).first().click()
  await expect(second.getByText('Nothing planned yet.')).toBeVisible()
  await finish(second, 'S17')
})
test('S18 + S19 overlap toast is honest and links to the schedule', async ({ page }) => {
  await seed(page); await plan(page, A)
  await card(page, C).click(); await details(page).getByRole('button', { name: '+ Plan to attend' }).click()
  const toast = page.locator('.sq-toasts')
  await expect(toast).toContainText(/overlap/i)
  await expect(toast.getByRole('link', { name: 'Check My Schedule' })).toBeVisible()
  await finish(page, 'S18', { strict: false })
  await toast.getByRole('link', { name: 'Check My Schedule' }).click()
  await expect.poll(async () => (await scheduleTitles(page)).sort()).toEqual([A, C].sort())
  await finish(page, 'S19')
})

// ---------------- F. Navigation and consistency ----------------
test('N01 header navigation marks the right page', async ({ page }) => {
  await seed(page); await open(page)
  const current = page.locator('header a[aria-current="page"]')
  await page.locator('header').getByRole('link', { name: /Post an event/ }).click(); await expect(current).toHaveText(/Post an event/)
  await page.locator('header').getByRole('link', { name: /My Schedule/ }).click(); await expect(current).toHaveText(/My Schedule/)
  await page.locator('header').getByRole('link', { name: /Discover/ }).click(); await expect(current).toHaveText(/Discover/)
  await finish(page, 'N01')
})
test('N02 Back to Discover', async ({ page }) => {
  await seed(page); await open(page, '#post')
  await page.getByRole('link', { name: 'Back to Discover' }).click()
  await expect(card(page, A)).toBeVisible()
  await finish(page, 'N02')
})
test('N03 Post something opens the same form as the header', async ({ page }) => {
  await seed(page); await open(page)
  await page.getByRole('link', { name: /Post something/ }).click()
  await expect(postForm(page)).toBeVisible(); await expect(page.locator('header a[aria-current="page"]')).toHaveText(/Post an event/)
  await finish(page, 'N03')
})
test('N04 Post an event from the no-match note', async ({ page }) => {
  await seed(page); await open(page); await setWindow(page, '2026-12-04', '14:31', '15:29')
  await finish(page, 'N04-before')
  await page.locator('main').getByRole('link', { name: 'Post an event' }).click()
  await expect(postForm(page)).toBeVisible()
  await finish(page, 'N04')
})
test('N05 every page-to-page link uses the drawn arrow', async ({ page }) => {
  await seed(page); await open(page)
  const looks: Locator[] = [page.getByRole('link', { name: /Post something/ })]
  for (const l of looks) await expect(l.locator('.sq-pen-arrow')).toBeVisible()
  await setWindow(page, '2026-12-04', '14:31', '15:29')
  await expect(page.locator('main').getByRole('link', { name: 'Post an event' }).locator('.sq-pen-arrow')).toBeVisible()
  await finish(page, 'N05')
  await page.goto('/#post'); await expect(page.getByRole('link', { name: 'Back to Discover' }).locator('.sq-pen-arrow')).toBeVisible()
})
test('N06 the plan badge says 1 on every page', async ({ page }) => {
  await seed(page); await plan(page, A)
  for (const hash of ['#discover', '#post', '#schedule']) {
    await page.goto('/' + hash)
    await expect(page.locator('header').getByRole('link', { name: /My Schedule/ })).toHaveText(/1/)
  }
  await finish(page, 'N06')
})
test('N07 an invalid window looks different from a valid one', async ({ page }) => {
  await seed(page); await open(page); await setWindow(page, '2026-12-04', '14:30', '15:30')
  const look = () => page.getByLabel('until', { exact: true }).evaluate(el => { const f = el.closest('label')!; const s = getComputedStyle(f); return s.backgroundColor + s.borderTopColor + s.color })
  const valid = await look()
  await setWindow(page, '2026-12-04', '17:00', '14:00')
  await expect(page.locator('#sq-free-error')).toBeVisible()
  expect(await look()).not.toBe(valid)
  await finish(page, 'N07')
})
test('N08 keyboard reaches A and opens it', async ({ page }) => {
  await seed(page); await open(page)
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab')
    if (await card(page, A).evaluate(el => el === document.activeElement)) break
  }
  await expect(card(page, A)).toBeFocused(); await page.keyboard.press('Enter')
  await expect(details(page)).toContainText('Paint together')
  await finish(page, 'N08')
})
test('N09 Post form tab order matches reading order', async ({ page }) => {
  await seed(page); await page.goto('/#post')
  await postForm(page).getByLabel('EVENT NAME', { exact: true }).focus()
  const order: string[] = []
  // Chromium gives a date field one tab stop per part (month, day, year), so repeats are collapsed.
  for (let i = 0; i < 14; i++) { const id = await page.evaluate(() => document.activeElement?.id || ''); if (order.at(-1) !== id) order.push(id); await page.keyboard.press('Tab') }
  expect(order.slice(0, 7)).toEqual(['post-title', 'post-hostName', 'post-description', 'post-location', 'post-date', 'post-start', 'post-end'])
  await finish(page, 'N09')
})
test('N10 reload keeps the route', async ({ page }) => {
  await seed(page)
  for (const [hash, sign] of [['#discover', 'Discover'], ['#post', 'Post an event'], ['#schedule', 'My Schedule']] as const) {
    await page.goto('/' + hash); await page.reload()
    await expect(page.locator('header a[aria-current="page"]')).toHaveText(new RegExp(sign))
  }
  await finish(page, 'N10')
})
test('N11 removing a plan gives one honest message', async ({ page }) => {
  await seed(page); await plan(page, A); await page.goto('/#schedule')
  await page.getByRole('button', { name: `Remove ${A} from plans` }).first().click()
  await expect(page.locator('.sq-toasts [role="status"], .sq-toasts [role="alert"]')).toHaveCount(1)
  await finish(page, 'N11', { strict: false })
})

// ---------------- G. Window sizes ----------------
const SIZES: [number, number][] = [[320, 700], [375, 812], [760, 900], [761, 900], [1024, 768], [1280, 800]]
const VSTATES: [string, boolean, (page: Page) => Promise<void>][] = [
  ['clean Discover', false, async p => { await expect(p.getByText('No events to show yet.')).toBeVisible() }],
  ['seeded Discover', true, async p => { await expect.poll(() => cardTitles(p)).toEqual(ALL) }],
  ['no match', true, async p => { await setWindow(p, '2026-12-04', '14:31', '15:29'); await expect(p.getByText('No events fit this window.')).toBeVisible() }],
  ['Post errors', true, async p => { await p.goto('/#post'); await submit(p); await expect(fieldError(p, 'title')).toBeVisible() }],
  ['empty Schedule', true, async p => { await p.goto('/#schedule'); await expect(p.getByText('Nothing planned yet.')).toBeVisible() }],
  ['Schedule with overlap', true, async p => { await plan(p, A); await plan(p, C); await p.goto('/#schedule'); await expect(schedule(p)).toContainText('by 45 min') }],
]
let v = 1
for (const [state, needsSeed, reach] of VSTATES) for (const size of SIZES) {
  const id = `V${String(v++).padStart(2, '0')}`
  test(`${id} ${state} at ${size[0]}×${size[1]}`, async ({ page }) => {
    if (needsSeed) await seed(page)
    await open(page, '#discover', size); await reach(page)
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    await finish(page, id)
  })
}
test('V37 phone sheet with bottom nav', async ({ page }) => {
  await seed(page); await open(page, '#discover', [375, 812]); await card(page, A).click()
  await expect(details(page).getByRole('button', { name: '+ Plan to attend' })).toBeInViewport()
  await finish(page, 'V37')
})
test('V38 sheet on a short phone', async ({ page }) => {
  await seed(page); await open(page, '#discover', [375, 568]); await card(page, A).click()
  const btn = details(page).getByRole('button', { name: '+ Plan to attend' }); await btn.scrollIntoViewIfNeeded()
  await expect(btn).toBeInViewport(); await expect(details(page).getByRole('button', { name: 'Close details' })).toBeVisible()
  await finish(page, 'V38')
})
// 200% browser zoom halves the CSS viewport; 400% quarters it.
test('V40 no match at 375×812, zoom 200%', async ({ page }) => {
  await seed(page); await open(page, '#discover', [188, 406]); await setWindow(page, '2026-12-04', '14:31', '15:29')
  await expect(page.getByRole('button', { name: 'Show all events' })).toBeVisible()
  // 200% on a 375px phone is a 188px-wide page, under the 320px that WCAG reflow asks for, so layout findings are recorded, not failed.
  await finish(page, 'V40', { strict: false })
})
test('V41 Post errors at 1280×800, zoom 200%', async ({ page }) => {
  await seed(page); await open(page, '#post', [640, 400]); await submit(page)
  await expect(fieldError(page, 'title')).toBeVisible()
  await finish(page, 'V41')
})
test('V42 Discover with A at 1280×800, zoom 400%', async ({ page }) => {
  await seed(page); await open(page, '#discover', [320, 200]); await card(page, A).click()
  await finish(page, 'V42')
})
test('V45 reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await seed(page); await open(page); await card(page, A).click()
  await expect(details(page)).toContainText('Paint together')
  await finish(page, 'V45')
})
test('V46 keyboard focus stays in the phone sheet', async ({ page }) => {
  await seed(page); await open(page, '#discover', [375, 812]); await card(page, A).focus(); await page.keyboard.press('Enter')
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press(i % 3 === 2 ? 'Shift+Tab' : 'Tab')
    expect(await page.evaluate(() => !!document.activeElement?.closest('aside.sq-sticker'))).toBe(true)
  }
  await page.keyboard.press('Escape'); await expect(details(page)).not.toHaveClass(/sq-open/)
  await finish(page, 'V46')
})
const MORE: [string, [number, number], (page: Page) => Promise<void>][] = [
  ['V47', [320, 700], async p => { await card(p, A).click(); await expect(details(p).getByRole('button', { name: 'Close details' })).toBeVisible() }],
  ['V48', [390, 844], async p => { await card(p, A).click(); await expect(details(p).getByRole('button', { name: '+ Plan to attend' })).toBeInViewport() }],
  ['V49', [430, 932], async p => { await setWindow(p, '2026-12-04', '14:31', '15:29'); await expect(p.getByRole('button', { name: 'Show all events' })).toBeVisible() }],
  ['V50', [760, 900], async p => { await card(p, A).click(); await expect(details(p)).toHaveClass(/sq-open/) }],
  ['V51', [761, 900], async p => { await card(p, A).click(); await expect(details(p)).toContainText('Paint together') }],
  ['V52', [1160, 900], async p => { await expect.poll(() => cardTitles(p)).toEqual(ALL) }],
  ['V53', [1161, 900], async p => { await expect.poll(() => cardTitles(p)).toEqual(ALL) }],
  ['V54', [1920, 1080], async p => { await expect.poll(() => cardTitles(p)).toEqual(ALL) }],
  ['V55', [812, 375], async p => { await setWindow(p, '2026-12-04', '14:31', '15:29'); await p.getByRole('button', { name: 'Show all events' }).scrollIntoViewIfNeeded(); await expect(p.getByRole('button', { name: 'Show all events' })).toBeInViewport() }],
  ['V56', [375, 812], async p => { await postViaForm(p, ['QA Mobile Success', 'SideQuest QA', 'Test', 'Benson 101', '2026-12-05', '18:30', '19:30']); await expect(p.getByText('Posted “QA Mobile Success”')).toBeInViewport() }],
  ['V57', [375, 568], async p => { await plan(p, A); await card(p, C).click(); await details(p).getByRole('button', { name: '+ Plan to attend' }).click(); await expect(p.locator('.sq-toasts').getByRole('link', { name: 'Check My Schedule' })).toBeVisible() }],
]
for (const [id, size, act] of MORE) {
  test(`${id} at ${size[0]}×${size[1]}`, async ({ page }) => {
    await seed(page); await open(page, '#discover', size); await act(page)
    if (id === 'V57') { await expect(page.locator('.sq-toasts')).toContainText(/overlap/i) }
    await finish(page, id, { strict: !['V56', 'V57'].includes(id) })
  })
}
for (const [id, size] of [['V58', [375, 812]], ['V59', [1280, 800]]] as const) {
  test(`${id} full window on an empty site at ${size[0]}×${size[1]}`, async ({ page }) => {
    await open(page, '#discover', [...size]); await setWindow(page, '2026-12-04', '14:30', '15:30')
    await expect(page.getByText('No events fit this window.')).toHaveCount(0)
    await expect(page.getByText('No events to show yet.')).toBeVisible()
    await finish(page, id)
  })
}

// ---------------- H. Failures this app can fake in the browser ----------------
test('X13–X15 corrupt plans: Cancel keeps them, OK recovers', async ({ page }) => {
  await seed(page); await page.goto('/')
  await page.evaluate(() => localStorage.setItem('sidequest.planned-event-ids.v1', '{broken'))
  await page.goto('/#schedule'); await page.reload()
  await expect(page.getByText(/could not be read/)).toBeVisible()
  await finish(page, 'X13', { strict: false })
  page.once('dialog', d => d.dismiss())
  await page.getByRole('button', { name: 'Recover valid plans' }).first().click()
  expect(await page.evaluate(() => localStorage.getItem('sidequest.planned-event-ids.v1'))).toBe('{broken')
  await finish(page, 'X14', { strict: false })
  page.once('dialog', d => d.accept())
  await page.getByRole('button', { name: 'Recover valid plans' }).first().click()
  await expect(page.getByText(/could not be read/)).toHaveCount(0)
  await finish(page, 'X15', { strict: false })
})
test('X22 storage that refuses to save never claims success', async ({ page }) => {
  await seed(page)
  await page.addInitScript(() => { const set = Storage.prototype.setItem; Storage.prototype.setItem = function (k: string, val: string) { if (k === 'sidequest.planned-event-ids.v1') throw new DOMException('full', 'QuotaExceededError'); return set.call(this, k, val) } })
  await page.goto('/#discover'); await card(page, A).click()
  await details(page).getByRole('button', { name: '+ Plan to attend' }).click()
  await expect(details(page).getByRole('button', { name: /In My Schedule/ })).toHaveCount(0)
  await expect(page.locator('.sq-toasts')).toContainText(/could not|couldn’t|not saved|failed/i)
  await finish(page, 'X22', { strict: false })
})

test.describe('Not run by machine', () => {
  const reasons: [string, string][] = [
    ['V39', 'needs a real phone keyboard'], ['V43', 'needs Firefox'], ['V44', 'needs Safari or an iPhone'],
    ['X01–X12, X16–X21, X23–X25', 'need the developer fixtures named in the issue'],
    ['U01–U04', 'need a student who has never seen SideQuest'],
  ]
  for (const [id, why] of reasons) test.skip(`${id}: ${why}`, () => {})
})
