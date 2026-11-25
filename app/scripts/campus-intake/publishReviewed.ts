// Explicit operator command, never called by the public web server or scheduler.
// The database owner must first review and apply the separate SQL proposal.
import { spawnSync } from 'node:child_process'
import { readFileSync, statSync } from 'node:fs'
import { prepareReviewedPublication } from '../../src/controller/prepareReviewedPublication'

const query = "select sidequest_intake.publish_reviewed_occurrence(" +
  ":'provider', :'occurrence_id', :'source_url', :'checked_at'::timestamptz, " +
  ":'title', :'host', :'description', :'location', :'event_date'::date, " +
  ":'start_time'::time, :'end_time'::time);\n"

function readJson(path: string) {
  const info = statSync(path)
  if (!info.isFile() || info.size > 100_000) throw new Error('Invalid or oversized review file')
  const bytes = readFileSync(path)
  if (bytes.length > 100_000) throw new Error('Review file exceeds limit')
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
}

function main() {
  const [mode, file, ...rest] = process.argv.slice(2)
  if (!file || rest.length || !['--validate', '--publish-reviewed'].includes(mode)) {
    throw new Error('Usage: publishReviewed --validate|--publish-reviewed REVIEW.json')
  }
  const candidate = readJson(file)
  const registry = readJson('data/campus-event-sources.json')
  const source = registry.sources.find((entry: { id: string }) => entry.id === candidate.provider)
  if (!source) throw new Error('Unregistered source')
  const prepared = prepareReviewedPublication({ ...candidate, sourceOrigin: new URL(source.page).origin })
  if (mode === '--validate') {
    console.log(JSON.stringify({ validated: true, published: false, provider: prepared.provider }))
    return
  }
  if (process.env.SIDEQUEST_INTAKE_WRITE_APPROVED !== 'yes' ||
      !process.env.PGHOST || !process.env.PGDATABASE || !process.env.PGUSER) {
    throw new Error('Explicit database-owner approval and database connection configuration required')
  }
  const values = {
    provider: prepared.provider, occurrence_id: prepared.occurrenceId,
    source_url: prepared.sourceUrl, checked_at: prepared.checkedAt,
    title: prepared.draft.title, host: prepared.draft.hostName,
    description: prepared.draft.description, location: prepared.draft.location,
    event_date: prepared.draft.date, start_time: prepared.draft.start, end_time: prepared.draft.end,
  }
  // psql's :'variable' expansion quotes data as SQL literals. Never assemble
  // SQL from source text, and never put database credentials in command arguments.
  const args = ['-X', '-w', '-qAt', '-v', 'ON_ERROR_STOP=1',
    ...Object.entries(values).flatMap(([key, value]) => ['-v', key + '=' + value]), '-f', '-']
  const result = spawnSync('psql', args, { input: query, encoding: 'utf8', timeout: 30_000 })
  const id = result.stdout?.trim()
  if (result.error || result.status !== 0 || !id ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    // A timeout can be ambiguous. Retry the same verified occurrence ID; the
    // transaction is idempotent, and no unconfirmed success is shown.
    throw new Error('Publication not confirmed. Check the database or retry the same reviewed occurrence.')
  }
  console.log(JSON.stringify({ published: true, eventId: id }))
}

try { main() }
catch (error) {
  console.error(error instanceof Error ? error.message : 'Reviewed publication failed')
  process.exitCode = 1
}
