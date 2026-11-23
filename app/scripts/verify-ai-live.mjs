// Opt-in single-request live verification. Do not print credentials.
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is missing. Put it in app/.env.local (ignored by Git), or configure it in the trusted Node environment.')
  process.exit(2)
}

const vitest = fileURLToPath(new URL('../node_modules/vitest/vitest.mjs', import.meta.url))
const result = spawnSync(process.execPath, [vitest, 'run', 'tests/ai.live.test.ts'], {
  stdio: 'inherit',
  env: { ...process.env, SIDEQUEST_AI_LIVE_SMOKE: '1' },
})
if (result.error) {
  console.error('Could not launch the live verification process.')
  process.exit(2)
}
process.exit(result.status ?? 1)
