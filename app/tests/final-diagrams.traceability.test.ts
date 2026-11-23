import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Diagram validation is a source-integrity check, not a substitute for opening
// the drawings in diagrams.net or reviewing the real SQL/auth implementation.
const root = fileURLToPath(new URL('../../', import.meta.url))
const read = (path: string) => readFileSync(join(root, path), 'utf8')
const crc = read('docs/diagrams/FINAL_PROJECT_CRC.drawio')
const er = read('docs/diagrams/FINAL_PROJECT_ER.drawio')

function diagrams(xml: string): string[] {
  return [...xml.matchAll(/<diagram\b[^>]*>[\s\S]*?<\/diagram>/g)].map(match => match[0])
}

describe('final CRC / ER drawing source and course evidence', () => {
  it('keeps two separately editable pages in both diagrams.net files', () => {
    for (const source of [crc, er]) {
      expect(source.startsWith('<?xml')).toBe(true)
      expect(source).toMatch(/<mxfile\b[^>]*pages="2"/)
      const pages = diagrams(source)
      expect(pages).toHaveLength(2)
      expect(source).not.toContain('&amp;lt;br/')
      expect(source).not.toContain('&amp;#xa;')
      for (const page of pages) {
        expect(page).toContain('<mxGraphModel')
        expect(page).toContain('<mxGeometry')
        const ids = [...page.matchAll(/<mxCell\b[^>]*\bid="([^"]+)"/g)].map(match => match[1])
        expect(ids.length).toBeGreaterThanOrEqual(10)
        expect(new Set(ids).size).toBe(ids.length)
        const names = new Set(ids)
        const refs = [...page.matchAll(/\b(?:source|target)="([^"]+)"/g)].map(match => match[1])
        for (const id of refs) expect(names.has(id), `missing shape for edge endpoint ${id}`).toBe(true)
      }
    }
  })

  it('does not claim deployed SQL for local Someday or account-related group plans', () => {
    const erPages = diagrams(er)
    expect(erPages[0]).toContain('public.events')
    expect(erPages[0]).toContain('NOT SQL')
    expect(erPages[0]).toContain('localStorage')
    expect(erPages[1]).toContain('PROPOSED')
    expect(erPages[1]).toContain('group_participants')
    expect(erPages[1]).toContain('auth.users')
    const migration = read('supabase/migrations/20261103000000_create_events.sql')
    expect(migration).toContain('create table public.events')
    expect(migration).not.toContain('create table public.group_plans')
    expect(migration).not.toContain('create table public.group_participants')
  })

  it('documents implementation boundaries and links the editable sources', () => {
    const crcPages = diagrams(crc)
    expect(crcPages[0]).toContain('EventCatalog')
    expect(crcPages[0]).toContain('Someday')
    expect(crcPages[1]).toContain('GroupPlanService')
    expect(crcPages[1]).toContain('authorization')

    const guide = read('docs/FINAL_PROJECT_ARCHITECTURE_TRACEABILITY.md')
    const readme = read('README.md')
    for (const name of ['FINAL_PROJECT_CRC.drawio', 'FINAL_PROJECT_ER.drawio']) {
      expect(guide).toContain(name)
      expect(readme).toContain(name)
    }
    expect(guide).toContain('NOT IMPLEMENTED')
    expect(guide).toContain('NOT MIGRATED')
    expect(guide).toContain('Email-code sign-in and verified token gateway')
    expect(guide).toContain('feature OFF by default')
    expect(guide).toContain('NOT IMPLEMENTED')
    expect(read('docs/diagrams/FINAL_PROJECT_ER_PREVIEW.md')).toContain('not yet deployed')
    expect(read('docs/diagrams/FINAL_PROJECT_CRC_PREVIEW.md')).toContain('not connected yet')
  })
})
