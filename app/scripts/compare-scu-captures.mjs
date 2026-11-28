// Offline capture comparison. Requires the actual capture time, never invents freshness.
import { readFile, stat } from 'node:fs/promises'
import { compareScuCaptures } from './campus-intake/compareScuCaptures.mjs'

async function bounded(path) {
  const info = await stat(path)
  if (!info.isFile() || info.size > 2_000_000) throw new Error('Invalid or oversized capture')
  const data = await readFile(path)
  if (data.length > 2_000_000) throw new Error('Capture exceeds limit')
  return data
}

try {
  const [jsonPath, icsPath, checkedAt, ...rest] = process.argv.slice(2)
  if (!jsonPath || !icsPath || !checkedAt || rest.length ||
      !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:Z|[+-]\d\d:\d\d)$/.test(checkedAt) ||
      !Number.isFinite(Date.parse(checkedAt)) || Date.parse(checkedAt) > Date.now()) {
    throw new Error('Usage: node app/scripts/compare-scu-captures.mjs PAGE.json EVENTS.ics CAPTURE_ISO_TIME')
  }
  const registry = JSON.parse(await readFile(new URL('../data/campus-event-sources.json', import.meta.url), 'utf8'))
  const source = registry.sources.find(row => row.id === 'scu-livewhale')
  const body = new TextDecoder('utf-8', { fatal: true }).decode(await bounded(jsonPath))
  const payload = JSON.parse(body)
  const snapshot = compareScuCaptures(payload, await bounded(icsPath), source, new Date(checkedAt).toISOString())
  console.log(JSON.stringify(snapshot, null, 2))
} catch (error) {
  console.error('Capture comparison failed: ' + error.message)
  process.exitCode = 1
}
