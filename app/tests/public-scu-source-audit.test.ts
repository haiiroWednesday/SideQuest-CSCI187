import { describe, expect, it } from 'vitest'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const program = fileURLToPath(new URL('../scripts/audit-public-event-sources.mjs', import.meta.url))
function invoke(args: string[]) {
  return spawnSync(process.execPath, [program, ...args], {
    encoding: 'utf8', timeout: 10_000,
    env: { PATH: process.env.PATH ?? '' },
  })
}
function syntheticFixture(value: unknown, verify: (path: string) => void) {
  const directory = mkdtempSync(join(tmpdir(), 'sidequest-sources-'))
  const file = join(directory, 'fixture.json')
  try {
    writeFileSync(file, JSON.stringify(value), { encoding: 'utf8' })
    verify(file)
  } finally { rmSync(directory, { recursive: true, force: true }) }
}

describe('public SCU source intake: inspection only, not publication', () => {
  it('prints an offline source inventory without contacting any external service', () => {
    const output = execFileSync(process.execPath, [program], { encoding: 'utf8' })
    expect(output).toContain('11 source groups')
    expect(output).toContain('qlusion | manual-review | page-confirmed-feed-unverified')
    expect(output).toContain('scu-livewhale | livewhale-json-probe')
    expect(output).toContain('OFFLINE ONLY: No requests or data writes')
    expect(output).not.toContain('POSTED')
  })

  it('recognizes a synthetic LiveWhale v2 object while preserving missing time uncertainty', () => {
    syntheticFixture({
      meta: { type: 'events' },
      data: [{ id: 1, title: 'Synthetic campus activity', date: '2026-12-03',
        date_time: '19:00', date2_time: null, location: 'Test Hall', summary: 'Test' }],
    }, file => {
      const r = invoke(['--fixture=' + file])
      expect(r.status).toBe(0)
      expect(r.stdout).toContain('"format":"v2-style-data"')
      expect(r.stdout).toContain('"inspected":1')
      expect(r.stdout).toContain('"needsHumanSourceValidation":true')
      expect(r.stdout).toContain('"published":false')
      expect(r.stdout).not.toContain('Synthetic campus activity')
    })
  })

  it('recognizes both synthetic legacy LiveWhale API return shapes', () => {
    for (const [payload, expected] of [
      [[{ title: 'Synthetic', date: '2026-12-03' }], 'v1-array'],
      [{ total_results: 1, results: [{ title: 'Synthetic' }] }, 'v1-paginated-results'],
    ] as const) {
      syntheticFixture(payload, file => {
        const result = invoke(['--fixture=' + file])
        expect(result.status).toBe(0)
        expect(result.stdout).toContain('"format":"' + expected + '"')
      })
    }
  })

  it('fails closed on missing records, unknown payloads and accidental write arguments', () => {
    syntheticFixture({ errors: ['Forbidden'] }, file => {
      const result = invoke(['--fixture=' + file])
      expect(result.status).toBe(1)
      expect(result.stderr).toContain('Unknown LiveWhale JSON structure')
    })
    for (const args of [
      ['--apply'], ['--confirm-public-posting'], ['--probe-livewhale', '--apply'],
      ['--probe-livewhale', '--probe-livewhale'], ['--fixture=/tmp/nonexistent', '--probe-livewhale'],
    ]) {
      const result = invoke(args)
      expect(result.status).toBe(1)
      expect(result.stderr).toContain('Usage:')
    }
  })

  it('refuses a live probe without the same source approval gate used by the collector', () => {
    const result = invoke(['--probe-livewhale'])
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Source access approval required')
  })

  it('recognizes timestamp keys appearing after the first ten records', () => {
    syntheticFixture({ data: [
      ...Array.from({ length: 10 }, () => ({ id: 1, title: 'Synthetic' })),
      { id: 2, href: '/event/2', date_ts: 1796152800, date2_ts: 1796156400 },
    ] }, file => {
      const result = invoke(['--fixture=' + file])
      expect(result.status).toBe(0)
      expect(result.stdout).toContain('"hasTimeKeys":true')
      expect(result.stdout).toContain('"explicitEndKeyFound":true')
    })
  })

  it('rejects an oversized offline fixture', () => {
    syntheticFixture({ data: [{ title: 'x'.repeat(250001) }] }, file => {
      const result = invoke(['--fixture=' + file])
      expect(result.status).toBe(1)
      expect(result.stderr).toContain('bounded size limit')
    })
  })

  it('rejects inconsistent JSON items without silently claiming an import', () => {
    syntheticFixture({ data: [null, { id: 2 }] }, file => {
      const result = invoke(['--fixture=' + file])
      expect(result.status).toBe(1)
      expect(result.stderr).toContain('non-object event records')
    })
  })
})
