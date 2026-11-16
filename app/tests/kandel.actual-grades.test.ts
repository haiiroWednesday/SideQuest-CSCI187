import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import grades from '../../docs/kandel-m1-m2-actual-grades.json'
import rubric from '../../docs/kandel-rubric-evidence.json'

const root = fileURLToPath(new URL('../../', import.meta.url))
const read = (path: string) => readFileSync(new URL(path, 'file://' + root), 'utf8')

describe('actual Kandel M1/M2 historical rubric and M2 regressions', () => {
  it('preserves the instructor-reported point totals without treating them as future results', () => {
    expect(grades.version).toBe(1)
    for (const [milestone, scored, possible] of [
      ['M1', 8.25, 9], ['M2', 11.5, 12],
    ] as const) {
      const result = grades.milestones[milestone]
      expect(result.earned).toBe(scored)
      expect(result.max).toBe(possible)
      expect(result.categories.reduce((total, category) => total + category.earned, 0)).toBe(scored)
      expect(result.categories.reduce((total, category) => total + category.max, 0)).toBe(possible)
      expect(result.categories.every(category => category.earned <= category.max && category.earned >= 0)).toBe(true)
      expect(result.feedback.length).toBeGreaterThan(0)
    }
    expect(grades.status).toMatch(/Historical actual grades/)
  })

  it('records the precise graded M2 deductions and the CRC/ER breakdown', () => {
    const categories = grades.milestones.M2.categories
    const byId = (id: string) => categories.find(category => category.id === id)
    expect(byId('readme')).toMatchObject({ earned: .5, max: .75 })
    expect(byId('ux')).toMatchObject({ earned: .5, max: .75 })
    for (const id of ['requirements', 'prototype', 'architecture', 'testing', 'crc', 'er']) {
      expect(byId(id)?.earned).toBe(byId(id)?.max)
    }
    const crc = byId('crc'), er = byId('er')
    expect(crc?.criteria?.reduce((sum, criterion) => sum + criterion.points, 0)).toBe(1)
    expect(er?.criteria?.reduce((sum, criterion) => sum + criterion.points, 0)).toBe(1)
    expect(grades.milestones.M2.feedback.join(' ')).toContain('Show all eventsPost an event')
    expect(grades.milestones.M2.feedback.join(' ')).toContain('inputs turn red')
  })

  it('retains the M1 historical issues while keeping present testing evidence separate', () => {
    const m1 = grades.milestones.M1
    const earned = Object.fromEntries(m1.categories.map(category => [category.id, category.earned]))
    expect(earned).toMatchObject({
      requirements: 1.5, readme: .75, prototype: 2.75,
      architecture: .5, testing: 2, ux: .75,
    })
    expect(m1.feedback.join(' ')).toMatch(/Controller should mediate/)
    expect(m1.feedback.join(' ')).toMatch(/past/)
    expect(rubric.historicalGradeRecord).toBe('docs/kandel-m1-m2-actual-grades.json')
  })

  it('keeps README onboarding command-first with detailed guidance elsewhere', () => {
    for (const path of ['README.md', 'app/README.md']) {
      const body = read(path)
      const firstCommand = body.indexOf('```sh')
      const detailedSection = body.indexOf('## Design and project documents')
      expect(firstCommand, `${path}: missing runnable command block`).toBeGreaterThanOrEqual(0)
      expect(firstCommand, `${path}: setup commands should appear immediately`).toBeLessThan(500)
      expect(body).toMatch(/npm ci/)
      expect(body).toMatch(/npm run dev/)
      expect(body).toMatch(/SUPABASE_URL/)
      expect(body).toMatch(/SUPABASE_PUBLISHABLE_KEY/)
      expect(body).toMatch(/docs\/|\.\.\/docs\//)
      if (detailedSection > 0) expect(firstCommand).toBeLessThan(detailedSection)
    }
    // Do not turn length or wording preferences into arbitrary CI grading thresholds.
  })

  it('links both professor-cited M2 UX defects to runnable browser scenarios', () => {
    const source = read('app/e2e/kandel-m2-ux-regressions.spec.ts')
    expect(source).toContain('No events fit this window.')
    expect(source).toContain('Show all events')
    expect(source).toContain('Post an event')
    expect(source).toContain('borderTopColor')
    expect(rubric.automated.filter(item => item.id.startsWith('RUBRIC-M2-'))).toHaveLength(3)
  })
})
