import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// No external network, accounts or provider keys. Exercising the CLI parser
// protects the production-only security probe from accidental staging actions.
const script = fileURLToPath(new URL('../scripts/smoke-group-permissions.mjs', import.meta.url))
function call(args: string[]) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: 'utf8', timeout: 10_000,
    env: { PATH: process.env.PATH ?? '' },
  })
}
describe('staging group security probe is explicitly opt-in and HTTPS-only', () => {
  it('refuses missing or invalid arguments before making any request', () => {
    expect(call([]).status).toBe(2)
    expect(call(['http://localhost:3000']).status).toBe(2)
    expect(call(['https://example.test/path']).status).toBe(2)
    expect(call(['https://example.test', '--unrecognized-live']).status).toBe(2)
  })

  it('refuses credential-bearing, query-bearing and fragment-bearing URLs', () => {
    expect(call(['https://user:password@example.test/']).status).toBe(2)
    expect(call(['https://example.test/?token=secret']).status).toBe(2)
    expect(call(['https://example.test/#frag']).status).toBe(2)
  })
})
