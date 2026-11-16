import { expect, test } from '@playwright/test'
import { sharedCatalogHttpFixture, SHARED_APP } from './helpers/sharedCatalog'
import { campusDateFromToday } from '../tests/fixtures/campusDateValue'
import type { EventRow } from '../src/model/eventCatalog'

// Release-stage, black-box smoke against the real local Node API and the
// isolated PostgREST fixture. Measurements are diagnostic, not a live SLO.
test('bounded concurrent reads recover after a simulated catalog outage', async ({ browser }) => {
  test.setTimeout(90_000)
  const event: EventRow = {
    id: '99999999-9999-4999-8999-999999999999',
    title: 'Reliability workshop', host_name: 'SCU Club',
    description: 'Bounded read and recovery test', location: 'Library',
    event_date: campusDateFromToday(30), start_time: '14:30:00', end_time: '15:30:00',
  }
  const backend = sharedCatalogHttpFixture([event])
  const context = await browser.newContext()
  const samples: number[] = []

  async function checkBatch(count: number, expectedStatus: number) {
    const statuses = await Promise.all(Array.from({ length: count }, async () => {
      const started = performance.now()
      const response = await context.request.get(`${SHARED_APP}/api/events`)
      samples.push(performance.now() - started)
      if (response.status() === 200) {
        const events = await response.json() as EventRow[]
        expect(events.map(item => item.id)).toEqual([event.id])
      } else {
        const error = await response.json() as { error?: string }
        expect(error.error).toBeTruthy()
      }
      return response.status()
    }))
    expect(statuses).toEqual(Array.from({ length: count }, () => expectedStatus))
  }

  try {
    await backend.attach(context)
    await checkBatch(12, 200)
    await backend.failReads(true)
    await checkBatch(6, 503)
    await backend.failReads(false)
    await checkBatch(6, 200)

    const state = await backend.state()
    expect(state.rows).toHaveLength(1)
    expect(state.rows[0].id).toBe(event.id)
    expect(state.methods).toEqual(Array.from({ length: 24 }, () => 'GET'))

    const measured = [...samples].sort((a, b) => a - b)
    const metrics = {
      environment: 'local Node API + isolated PostgREST fixture',
      requests: measured.length,
      concurrentBatchSize: 12,
      expectedOutageResponses: 6,
      p50Ms: Math.round(measured[Math.floor(measured.length / 2)]),
      p95Ms: Math.round(measured[Math.ceil(measured.length * .95) - 1]),
      note: 'Diagnostic only; not a production load, stress, or capacity certification.',
    }
    await test.info().attach('bounded-read-latency.json', {
      body: Buffer.from(JSON.stringify(metrics, null, 2)),
      contentType: 'application/json',
    })
  } finally {
    await backend.failReads(false)
    await context.close()
  }
})
