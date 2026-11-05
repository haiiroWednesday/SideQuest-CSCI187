import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const source = new URL('../data/scu-events-review-2026-11-04.json', import.meta.url)
const program = fileURLToPath(new URL('../scripts/review-scu-events.mjs', import.meta.url))
const batch = JSON.parse(readFileSync(source, 'utf8')) as {
  events: Array<Record<'reviewId' | 'date' | 'start' | 'end' | 'title' | 'hostName' | 'location' | 'summary' | 'sourceUrl', string>>
}

describe('curated SCU source batch: no unverified publication', () => {
  it('contains 15–20 independently reviewable entries with valid same-day intervals', () => {
    expect(batch.events.length).toBeGreaterThanOrEqual(15)
    expect(batch.events.length).toBeLessThanOrEqual(20)
    const ids = new Set<string>()
    const fingerprints = new Set<string>()
    for (const event of batch.events) {
      expect(event.reviewId).toMatch(/^SCU-2026-11-/)
      expect(ids.has(event.reviewId)).toBe(false)
      ids.add(event.reviewId)
      expect(event.date).toMatch(/^2026-11-\d\d$/)
      expect(event.start).toMatch(/^\d\d:\d\d$/)
      expect(event.end).toMatch(/^\d\d:\d\d$/)
      expect(event.end > event.start).toBe(true)
      expect(event.title.length).toBeLessThanOrEqual(120)
      expect(event.hostName.length).toBeLessThanOrEqual(120)
      expect(event.location.length).toBeLessThanOrEqual(200)
      expect((event.summary + '\nSource: ' + event.sourceUrl).length).toBeLessThanOrEqual(2000)
      expect(new URL(event.sourceUrl).protocol).toBe('https:')
      const signature = [event.title.toLowerCase(), event.date, event.start].join('|')
      expect(fingerprints.has(signature)).toBe(false)
      fingerprints.add(signature)
    }
  })

  it('can be reviewed offline, without a write token or any shared-database calls', () => {
    const output = execFileSync(process.execPath, [program], { encoding: 'utf8', timeout: 10_000 })
    expect(output).toContain('DRY RUN: No API requests and no database writes')
    expect(output).toContain('Review batch: 19 records')
  })

  it('refuses accidental publication without two explicit arguments', () => {
    const result = spawnSync(process.execPath, [program, '--apply'], { encoding: 'utf8', timeout: 10_000 })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('requires BOTH --apply and --confirm-public-posting')
  })
})
