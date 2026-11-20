import { describe, expect, it } from 'vitest'
import { findCampusWalk, type CampusPedestrianGraph } from '../src/model/campusRoutes'

// Synthetic graph, NOT real SCU coordinates or surveyed walking distances.
const graph: CampusPedestrianGraph = {
  nodes: [
    { id: 'A', label: 'Test building A' },
    { id: 'B', label: 'Test walkway corner B' },
    { id: 'C', label: 'Test building C' },
    { id: 'D', label: 'Test ramp D' },
  ],
  walkways: [
    { from: 'A', to: 'B', distanceMeters: 100, accessible: true, closed: false, verified: true, evidence: 'synthetic-unit-fixture' },
    { from: 'B', to: 'C', distanceMeters: 100, accessible: false, closed: false, verified: true, evidence: 'synthetic-unit-fixture' },
    { from: 'A', to: 'D', distanceMeters: 125, accessible: true, closed: false, verified: true, evidence: 'synthetic-unit-fixture' },
    { from: 'D', to: 'C', distanceMeters: 125, accessible: true, closed: false, verified: true, evidence: 'synthetic-unit-fixture' },
    { from: 'A', to: 'C', distanceMeters: 20, accessible: true, closed: false, verified: false, evidence: '' },
  ],
}

describe('audited campus pedestrian routing', () => {
  it('chooses the shorter verified walking path, without using a speculative shortcut', () => {
    expect(findCampusWalk(graph, 'A', 'C')).toEqual({
      status: 'ready', nodeIds: ['A', 'B', 'C'], distanceMeters: 200,
    })
    expect(findCampusWalk(graph, 'C', 'A')).toEqual({
      status: 'ready', nodeIds: ['C', 'B', 'A'], distanceMeters: 200,
    })
  })
  it('can restrict routes to verified accessible walkways', () => {
    expect(findCampusWalk(graph, 'A', 'C', { accessibleOnly: true })).toEqual({
      status: 'ready', nodeIds: ['A', 'D', 'C'], distanceMeters: 250,
    })
  })
  it('returns unknown-place or no-route instead of invented straight lines', () => {
    expect(findCampusWalk(graph, 'A', 'outside')).toEqual({ status: 'unavailable', reason: 'unknown-place' })
    const blocked: CampusPedestrianGraph = {
      ...graph,
      walkways: graph.walkways.map(edge => ({ ...edge, closed: true })),
    }
    expect(findCampusWalk(blocked, 'A', 'C')).toEqual({ status: 'unavailable', reason: 'no-walkable-route' })
  })
  it('rejects missing evidence, disconnected verified maps and malformed weights', () => {
    const uncertain: CampusPedestrianGraph = {
      ...graph, walkways: graph.walkways.map(edge => ({ ...edge, verified: false })),
    }
    expect(findCampusWalk(uncertain, 'A', 'C')).toEqual({ status: 'unavailable', reason: 'unverified-map' })
    const bad: CampusPedestrianGraph = {
      ...graph, walkways: [{ ...graph.walkways[0], distanceMeters: -5 }],
    }
    expect(findCampusWalk(bad, 'A', 'C')).toEqual({ status: 'unavailable', reason: 'invalid-graph' })
    const disconnected: CampusPedestrianGraph = {
      ...graph, walkways: graph.walkways.slice(0, 1),
    }
    expect(findCampusWalk(disconnected, 'A', 'C')).toEqual({ status: 'unavailable', reason: 'no-walkable-route' })
  })
  it('returns a zero-length path for the same known destination and rejects duplicate node IDs', () => {
    expect(findCampusWalk(graph, 'A', 'A')).toEqual({
      status: 'ready', nodeIds: ['A'], distanceMeters: 0,
    })
    expect(findCampusWalk({ ...graph, nodes: [...graph.nodes, { id: 'A', label: 'Duplicate' }] }, 'A', 'C'))
      .toEqual({ status: 'unavailable', reason: 'invalid-graph' })
  })
  it('breaks equal-distance ties deterministically by stable node ID', () => {
    const tied: CampusPedestrianGraph = {
      ...graph,
      walkways: graph.walkways.map(edge => ({ ...edge, distanceMeters: 100, accessible: true })),
    }
    expect(findCampusWalk(tied, 'A', 'C')).toMatchObject({ status: 'ready', nodeIds: ['A', 'B', 'C'], distanceMeters: 200 })
  })
})
