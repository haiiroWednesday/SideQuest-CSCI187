// Run from any working directory. Default mode lists sources without networking.
import { readFile, mkdir, writeFile, rename, rm } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { collectLiveWhale } from './campus-intake/collect.mjs'

const registry = JSON.parse(await readFile(new URL('../data/campus-event-sources.json', import.meta.url), 'utf8'))
const args = process.argv.slice(2)
const usage = 'Usage: node app/scripts/refresh-campus-events.mjs [--approved-read --output PATH [--days N]]'
function option(name) {
  const index = args.indexOf(name)
  return index === -1 ? null : args[index + 1]
}
async function main() {
  if (args.length === 0) {
    console.log(JSON.stringify(registry, null, 2))
    return
  }
  const output = option('--output')
  const rawDays = option('--days')
  const expected = ['--approved-read', '--output', output, ...(rawDays === null ? [] : ['--days', rawDays])]
  if (!args.includes('--approved-read') || !output || output.startsWith('-') ||
      expected.some(value => !args.includes(value)) || args.length !== expected.length) throw new Error(usage)
  if (process.env.SIDEQUEST_CAMPUS_FEED_APPROVED !== 'yes') {
    throw new Error('Set SIDEQUEST_CAMPUS_FEED_APPROVED=yes only after documented source-owner/access approval')
  }
  const horizonDays = rawDays === null ? 45 : Number(rawDays)
  const source = registry.sources.find(entry => entry.id === 'scu-livewhale')
  const snapshot = await collectLiveWhale(source, { approvedRead: true, horizonDays })
  const destination = resolve(output)
  const temporary = destination + '.tmp-' + process.pid
  await mkdir(dirname(destination), { recursive: true })
  try {
    await writeFile(temporary, JSON.stringify(snapshot, null, 2) + '\n', { flag: 'wx' })
    await rename(temporary, destination)
  } catch (error) {
    await rm(temporary, { force: true })
    throw error
  }
  console.log(JSON.stringify({ provider: snapshot.provider, checkedAt: snapshot.checkedAt,
    pages: snapshot.pages, received: snapshot.received,
    held: snapshot.records.filter(row => row.reviewState === 'held').length,
    awaitingReview: snapshot.records.filter(row => row.reviewState === 'awaiting-review').length,
    published: 0 }))
}
try { await main() }
catch (error) { console.error('Campus intake failed: ' + error.message); process.exitCode = 1 }
