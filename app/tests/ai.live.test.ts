// Explicitly opt-in live provider smoke test. Never runs during ordinary CI.
// One bounded request flows through SideQuest's REAL server API implementation.
// No user secrets, plans, or real student information are sent to the model.
import { createServer } from 'node:http'
import { expect, it } from 'vitest'
import { createAiDiscoverApi } from '../server/aiDiscover'
import { campusDateFromToday } from './fixtures/campusDateValue'
import type { CampusEvent, EventCatalogPort } from '../src/model/eventCatalog'

const runLive = process.env.SIDEQUEST_AI_LIVE_SMOKE === '1'
const testLive = runLive ? it : it.skip

testLive('real OpenAI Responses API selects a verified public SideQuest event ID', async () => {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is absent from the server environment. Do not paste it into chat or GitHub.')
  const id = '44444444-4444-4444-8444-444444444444'
  const event: CampusEvent = {
    id,
    title: 'Watercolor Painting Workshop',
    hostName: 'Example Art Club',
    description: 'A friendly watercolor painting workshop with brushes and paper.',
    location: 'Example Campus Room',
    date: campusDateFromToday(30),
    start: '14:30',
    end: '15:30',
  }
  const catalog: EventCatalogPort = {
    listUpcoming: async () => [event],
    getById: async key => key === id ? event : null,
    create: async () => { throw new Error('This verification catalog is read-only.') },
  }
  const handler = createAiDiscoverApi(catalog, {
    apiKey,
    model: process.env.SIDEQUEST_AI_MODEL || 'gpt-6-luna',
  })
  const server = createServer((req, res) => {
    void handler(req, res).then(handled => {
      if (!handled) { res.writeHead(404); res.end() }
    }).catch(() => {
      if (!res.headersSent) res.writeHead(503)
      res.end()
    })
  })
  try {
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    const address = server.address()
    if (!address || typeof address === 'string') throw Error('Could not bind the local verification server.')
    const baseUrl = `http://127.0.0.1:${address.port}`
    const status = await fetch(baseUrl + '/api/ai/status')
    expect(status.status).toBe(200)
    expect(await status.json()).toEqual({ available: true })

    const response = await fetch(baseUrl + '/api/ai/discover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: baseUrl },
      body: JSON.stringify({ query: 'I want a watercolor painting or art workshop' }),
      signal: AbortSignal.timeout(30_000),
    })
    const body: unknown = await response.json()
    // Only status and public test-event IDs may appear in the test output.
    // Do not log the provider payload, Authorization header, or environment.
    if (!response.ok) throw new Error(`Live AI discovery returned HTTP ${response.status}; check model access, API credits, and the server-side configuration.`)
    if (!body || typeof body !== 'object') throw Error('Invalid public discovery response.')
    const result = body as { matches?: { id: string }[]; timeInterpretation?: { applied: string } }
    expect(result.matches?.map(item => item.id)).toContain(id)
    expect(result.timeInterpretation?.applied).toBe('none')
    console.log('LIVE AI SMOKE PASS: real Responses API returned a catalog-backed suggestion via SideQuest.')
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()))
  }
}, 45_000)
