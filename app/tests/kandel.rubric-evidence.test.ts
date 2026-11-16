import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import rubric from '../../docs/kandel-rubric-evidence.json'

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url))
const absolute = (file: string) => join(repositoryRoot, file)
const expectedAutomated = [
  'DEV-UNIT', 'DEV-COMPONENT', 'DEV-SYSTEM', 'DEV-WHITEBOX',
  'DEV-REGRESSION', 'DEV-BOUNDARIES', 'RELEASE-BLACKBOX',
  'RELEASE-BUILD', 'NF-PERFORMANCE', 'NF-LOAD', 'NF-STRESS',
  'NF-SECURITY', 'NF-RELIABILITY', 'NF-ACCESSIBILITY',
  'NF-RESPONSIVE', 'NF-PRIVACY', 'CODE-MVC',
  'CODE-CONVENTIONS', 'CODE-SUPPRESSIONS', 'CODE-COMMENTS',
  'RUBRIC-M2-EMPTY-STATE', 'RUBRIC-M2-VALID-COLOR', 'RUBRIC-M2-README',
]
const expectedManual = [
  'CODE-READABILITY', 'DOC-SETUP', 'DOC-DIAGRAMS', 'REVIEW-QUALITY',
  'UX-UNGUIDED', 'UX-ACCESSIBILITY-MANUAL', 'UX-PERFORMANCE-REAL',
  'SEC-LIVE-SUPABASE', 'FINAL-PITCH', 'FINAL-DEMO', 'FINAL-RESULTS',
  'FINAL-PRESENTATION', 'FINAL-PEER-NOTES', 'EXTRA-CORE',
  'EXTRA-E2E', 'EXTRA-ACCESSIBILITY', 'EXTRA-EXTERNAL', 'EXTRA-PUBLISH',
]

describe('Kandel rubric traceability and release-evidence integrity', () => {
  it('accounts for every recorded course criterion exactly once', () => {
    expect(rubric.version).toBe(1)
    expect(rubric.automated.map(item => item.id).sort()).toEqual([...expectedAutomated].sort())
    expect(rubric.manual.map(item => item.id).sort()).toEqual([...expectedManual].sort())
    const allIds = [...rubric.automated, ...rubric.manual].map(item => item.id)
    expect(new Set(allIds).size).toBe(allIds.length)
    expect(Object.keys(rubric.sources).length).toBeGreaterThanOrEqual(5)
  })

  it('references real, nonempty tests or production verification scripts', () => {
    for (const item of rubric.automated) {
      expect(rubric.sources[item.source as keyof typeof rubric.sources], item.id).toMatch(/^https:\/\//)
      expect(item.evidence.length, item.id).toBeGreaterThan(0)
      for (const file of item.evidence) {
        expect(file, item.id).toMatch(/^(app\/(?:tests|e2e|scripts)\/|supabase\/tests\/)/)
        expect(file, item.id).not.toContain('..')
        expect(existsSync(absolute(file)), `${item.id}: missing ${file}`).toBe(true)
        const source = readFileSync(absolute(file), 'utf8')
        expect(source.trim().length, `${item.id}: empty ${file}`).toBeGreaterThan(20)
        if (/\.(?:test\.[jt]sx?|spec\.[jt]s)$/.test(file)) {
          expect(source, `${item.id}: test has no assertions/specs`).toMatch(/\b(?:it|test)(?:\.\w+)?\s*\(/)
        }
      }
    }
  })

  it('never silently marks subjective or live-service requirements complete', () => {
    const guide = readFileSync(absolute('docs/CSCI187_KANDEL_RUBRIC_EVIDENCE.md'), 'utf8')
    for (const item of rubric.manual) {
      expect(rubric.sources[item.source as keyof typeof rubric.sources], item.id).toMatch(/^https:\/\//)
      expect(existsSync(absolute(item.procedure)), item.id).toBe(true)
      expect(guide, `manual criterion ${item.id} missing from review guide`).toContain(item.id)
      expect(['pending', 'verified']).toContain(item.status)
      if (item.status === 'verified') {
        expect(item.verifiedBy, item.id).toBeTruthy()
        expect(item.verifiedAt, item.id).toBeTruthy()
        expect(item.evidence.length, item.id).toBeGreaterThan(0)
      }
    }
  })

  it('documents precise source and scope limits instead of claiming certification', () => {
    const guide = readFileSync(absolute('docs/CSCI187_KANDEL_RUBRIC_EVIDENCE.md'), 'utf8')
    expect(guide).toContain('Gradescope')
    expect(guide).toContain('release')
    expect(guide).toContain('No automatic grade')
    expect(guide).toContain('representative')
  })
})
