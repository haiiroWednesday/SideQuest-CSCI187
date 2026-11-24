// Convert a local, organizer-approved export into a review snapshot.
// No network access, catalog writes, or automatic publication.
import { readFile, stat } from 'node:fs/promises'
import { normalizeOrganizerExport } from './campus-intake/organizerExport.mjs'

const MAX_BYTES = 2_000_000
const usage = 'Usage: node app/scripts/review-organizer-export.mjs --approved-export SOURCE_ID FILE'
try {
  const [flag, sourceId, file, ...rest] = process.argv.slice(2)
  if (flag !== '--approved-export' || !sourceId || !file || rest.length) throw new Error(usage)
  const registry = JSON.parse(await readFile(new URL('../data/campus-event-sources.json', import.meta.url), 'utf8'))
  const source = registry.sources.find(entry => entry.id === sourceId)
  if (!source) throw new Error('Source is not registered')
  const metadata = await stat(file)
  if (!metadata.isFile() || metadata.size > MAX_BYTES) throw new Error('Invalid or oversized export file')
  const bytes = await readFile(file)
  if (bytes.length > MAX_BYTES) throw new Error('Export exceeds file limit')
  const payload = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  const snapshot = normalizeOrganizerExport(payload, source, { approvedExport: true })
  console.log(JSON.stringify(snapshot, null, 2))
} catch (error) {
  console.error('Organizer export rejected: ' + error.message)
  process.exitCode = 1
}
