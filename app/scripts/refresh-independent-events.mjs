// Read-only independent collection. Configuration is per source, never a global permission.
import { readFile, mkdir, writeFile, rename, rm } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { collectEngineeringNewsletters, collectOrganizerFeed } from './campus-intake/independentSources.mjs'
import { collectScuPresents } from './campus-intake/scuPresents.mjs'
import { collectPublicGoogleCalendar } from './campus-intake/googlePublicCalendar.mjs'

const registry = JSON.parse(await readFile(new URL('../data/campus-event-sources.json', import.meta.url), 'utf8'))
const args = process.argv.slice(2)
const usage = 'Usage: node app/scripts/refresh-independent-events.mjs [--approved-read --output PATH]'
async function main() {
  if (!args.length) {
    console.log('Independent sources are disabled by default. Configure approved public feeds per source.')
    return
  }
  if (args.length !== 3 || args[0] !== '--approved-read' || args[1] !== '--output' || !args[2] || args[2].startsWith('-')) throw new Error(usage)
  const config = JSON.parse(process.env.SIDEQUEST_INDEPENDENT_FEEDS ?? '{}')
  if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error('Invalid source approval configuration')
  const entries = Object.entries(config)
  if (!entries.length || entries.length > 20) throw new Error('No approved independent sources or too many configured sources')
  for (const [id, value] of entries) {
    const source = registry.sources.find(s => s.id === id)
    if (value?.transport !== undefined && (source?.adapter !== 'google-public-calendar' || value.transport !== 'public-ics')) throw new Error('Unsupported transport for ' + id)
    if (!source || id === 'scu-livewhale' || !value || value.approved !== true ||
        (!['google-public-calendar','scu-presents-dance','engineering-newsletter'].includes(source.adapter) && typeof value.url !== 'string')) {
      throw new Error('Unknown or unapproved independent source: ' + id)
    }
  }
  const now = new Date()
  const results = await Promise.all(entries.map(async ([id, value]) => {
    const source = registry.sources.find(s => s.id === id)
    try {
      let snapshot
      if (id === 'scu-engineering-newsletter') snapshot = await collectEngineeringNewsletters({approvedRead:true, now})
      else if (id === 'scu-presents-dance') snapshot = await collectScuPresents({approvedRead:true,now})
      else if (value.transport === 'public-ics') {
        const { collectPublicIcs } = await import('./campus-intake/publicIcs.mjs')
        snapshot = await collectPublicIcs(source, { approvedRead: true, now })
      } else if (source.adapter === 'google-public-calendar') snapshot = await collectPublicGoogleCalendar(source, {
        approvedRead:true, now, apiKey:process.env.SIDEQUEST_GOOGLE_PUBLIC_CALENDAR_API_KEY,
      })
      else snapshot = await collectOrganizerFeed(source,value.url,{approvedRead:true, now})
      return { id, status: snapshot.failures?.length ? 'partial' : 'received', snapshot }
    } catch {
      // Failure is explicit; do not leak URLs or credentials in logs, or imply cancellation.
      return { id, status:'failed', checkedAt:now.toISOString() }
    }
  }))
  const output = resolve(args[2]), temporary = output + '.tmp-' + process.pid
  await mkdir(dirname(output),{recursive:true})
  try {
    await writeFile(temporary,JSON.stringify({version:1,checkedAt:now.toISOString(),published:0,results},null,2)+'\n',{flag:'wx'})
    await rename(temporary,output)
  } catch (error) { await rm(temporary,{force:true}); throw error }
  console.log(JSON.stringify(results.map(r => ({id:r.id,status:r.status,candidates:r.snapshot?.records.length ?? 0}))))
  if (results.some(r => r.status !== 'received')) process.exitCode = 1
}
try { await main() } catch (error) { console.error(error.message); process.exitCode = 1 }
