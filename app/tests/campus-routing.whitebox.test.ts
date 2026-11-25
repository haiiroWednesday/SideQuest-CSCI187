import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import source from '../src/model/campusRoutes.ts?raw'
import { findCampusWalk, type CampusPedestrianGraph, type CampusRouteResult, type CampusWalkway } from '../src/model/campusRoutes'

type Router = typeof findCampusWalk
const IDS = ['A', 'B', 'C', 'D']
const nodes = IDS.map(id => ({ id, label: 'Synthetic node ' + id }))
const edge = (from: string, to: string, distanceMeters: number, overrides: Partial<CampusWalkway> = {}): CampusWalkway =>
  ({ from, to, distanceMeters, accessible: true, closed: false, verified: true, evidence: 'synthetic test fixture', ...overrides })
const graph = (...walkways: CampusWalkway[]): CampusPedestrianGraph => ({ nodes, walkways })

// An independent oracle enumerates all simple paths in a tiny graph.
// Unlike the production router, it never uses tentative distances or Dijkstra's selection rule.
function referenceRoute(input: CampusPedestrianGraph, start: string, finish: string, accessibleOnly: boolean): CampusRouteResult {
  const verified = input.walkways.filter(e => e.verified && e.evidence.trim() !== '')
  if (start === finish) return { status: 'ready', nodeIds: [start], distanceMeters: 0 }
  if (verified.length === 0) return { status: 'unavailable', reason: 'unverified-map' }
  const candidates: { nodeIds: string[]; distanceMeters: number }[] = []
  function visit(path: string[], distance: number) {
    const current = path[path.length - 1]
    if (current === finish) {
      candidates.push({ nodeIds: path, distanceMeters: distance })
      return
    }
    for (const e of verified) {
      if (e.closed || (accessibleOnly && !e.accessible)) continue
      const next = e.from === current ? e.to : e.to === current ? e.from : undefined
      if (next !== undefined && !path.includes(next)) visit([...path, next], distance + e.distanceMeters)
    }
  }
  visit([start], 0)
  candidates.sort((a, b) => a.distanceMeters - b.distanceMeters || a.nodeIds.join('').localeCompare(b.nodeIds.join('')))
  const best = candidates[0]
  return best ? { status: 'ready', ...best } : { status: 'unavailable', reason: 'no-walkable-route' }
}

const cases = [
  { name: 'unverified shortcut with evidence', input: graph(edge('A', 'C', 5, { verified: false }), edge('A', 'B', 10), edge('B', 'C', 10)), from: 'A', to: 'C', access: false },
  { name: 'verified edge without evidence', input: graph(edge('A', 'C', 5, { evidence: '   ' }), edge('A', 'B', 10), edge('B', 'C', 10)), from: 'A', to: 'C', access: false },
  { name: 'closed shortcut', input: graph(edge('A', 'C', 5, { closed: true }), edge('A', 'B', 10), edge('B', 'C', 10)), from: 'A', to: 'C', access: false },
  { name: 'inaccessible shortcut', input: graph(edge('A', 'C', 5, { accessible: false }), edge('A', 'B', 10), edge('B', 'C', 10)), from: 'A', to: 'C', access: true },
  { name: 'cheaper indirect route', input: graph(edge('A', 'C', 30), edge('A', 'B', 10), edge('B', 'C', 10)), from: 'A', to: 'C', access: false },
  { name: 'undirected reverse route', input: graph(edge('A', 'B', 10), edge('B', 'C', 10)), from: 'C', to: 'A', access: false },
  { name: 'equal distance ties', input: graph(edge('A', 'D', 10), edge('D', 'C', 10), edge('A', 'B', 10), edge('B', 'C', 10)), from: 'A', to: 'C', access: false },
]
function observed(router: Router, c: typeof cases[number]): CampusRouteResult {
  return router(c.input, c.from, c.to, { accessibleOnly: c.access })
}
function expected(c: typeof cases[number]): CampusRouteResult {
  return referenceRoute(c.input, c.from, c.to, c.access)
}

// Fixed seed; no external data, dependency, or real SCU path is involved.
function generatedGraphs(): CampusPedestrianGraph[] {
  let state = 0x5eed187
  const next = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state >>> 16
  }
  return Array.from({ length: 96 }, () => {
    const walkways: CampusWalkway[] = []
    for (let i = 0; i < IDS.length; i++) {
      for (let j = i + 1; j < IDS.length; j++) {
        const mode = next() % 6
        const distance = 1 + next() % 40
        if (mode === 0) continue
        walkways.push(edge(IDS[i], IDS[j], distance, {
          verified: mode !== 1, evidence: mode === 2 ? '' : 'synthetic test fixture',
          closed: mode === 3, accessible: mode !== 4,
        }))
      }
    }
    return graph(...walkways)
  })
}

describe('campus router: independent path oracle', () => {
  it.each(cases)('matches the exhaustive reference for $name', c => {
    expect(observed(findCampusWalk, c)).toEqual(expected(c))
  })

  it('matches exhaustive paths for all endpoints and both access modes on 96 small graphs', () => {
    for (const [index, input] of generatedGraphs().entries()) {
      for (const from of IDS) {
        for (const to of IDS) {
          for (const access of [false, true]) {
            expect(findCampusWalk(input, from, to, { accessibleOnly: access }),
              'graph ' + index + ': ' + from + ' -> ' + to + ', accessible=' + access)
              .toEqual(referenceRoute(input, from, to, access))
          }
        }
      }
    }
  })

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, 20_001])('rejects invalid edge weight %s', distance => {
    expect(findCampusWalk(graph(edge('A', 'B', distance)), 'A', 'B'))
      .toEqual({ status: 'unavailable', reason: 'invalid-graph' })
  })
})

function mutate(before: string, after: string): Router {
  // Fail closed if a refactor changes a mutation target; never silently skip it.
  expect(source.split(before).length - 1, 'review mutation target: ' + before).toBe(1)
  const compiled = ts.transpileModule(source.replace(before, after), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const exports: { findCampusWalk?: Router } = {}
  runInNewContext(compiled, { exports }, { timeout: 3000 })
  if (typeof exports.findCampusWalk !== 'function') throw new Error('Router export missing')
  return exports.findCampusWalk
}

describe('campus router: selected mutation pilot', () => {
  // The same independent cases must detect deliberately weakened routing rules.
  // This is a bounded seven-mutant pilot, not a repository-wide mutation score.
  it.each([
    ['unverified shortcut with evidence', '!edge.verified || !edge.evidence.trim()', '!edge.evidence.trim()'],
    ['verified edge without evidence', '!edge.verified || !edge.evidence.trim()', '!edge.verified'],
    ['closed shortcut', 'edge.closed || (options.accessibleOnly && !edge.accessible)', '(options.accessibleOnly && !edge.accessible)'],
    ['inaccessible shortcut', 'edge.closed || (options.accessibleOnly && !edge.accessible)', 'edge.closed'],
    ['cheaper indirect route', 'proposedDistance < previousDistance', 'proposedDistance > previousDistance'],
    ['undirected reverse route', 'adjacency.get(edge.to)!.push({ destination: edge.from, meters: edge.distanceMeters })', 'void 0'],
    ['equal distance ties', 'comparePath(paths.get(id)!, paths.get(current)!) < 0', 'comparePath(paths.get(id)!, paths.get(current)!) > 0'],
  ] as const)('detects the mutation for %s', (name, before, after) => {
    const altered = mutate(before, after)
    const target = cases.find(c => c.name === name)!
    // Check the original before evaluating its mutant; arbitrary failure is not a kill.
    expect(observed(findCampusWalk, target)).toEqual(expected(target))
    // A mutant can be detected by any case in the fixed corpus.
    const detected = cases.some(c => JSON.stringify(observed(altered, c)) !== JSON.stringify(expected(c))) ||
      generatedGraphs().some(input => IDS.some(from => IDS.some(to => [false, true].some(access => {
        return JSON.stringify(altered(input, from, to, { accessibleOnly: access })) !==
          JSON.stringify(referenceRoute(input, from, to, access))
      }))))
    expect(detected, 'surviving mutant: ' + name).toBe(true)
  })
})
