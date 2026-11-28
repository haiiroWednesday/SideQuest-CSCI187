// The campus map's live walking router (public/map/route.js), run from the exact file the map page
// loads. tests/campus.routes.test.ts covers findCampusWalk, which the map does not use.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { WALK_METRES, WALK_PLACES } from '../src/model/campusWalkTable'

type Place = { label?: string; acc: [number, number][] }
type Data = { gn: number[]; ge: number[]; places?: Place[] }
type Graph = { NN: number; NE: number; elen: Float32Array }
type Run = { dist: Float64Array; prev: Int32Array }
type Router = {
  FACT: number[]
  buildGraph(D: Data): Graph
  dijkstra(G: Graph, place: Place): Run
  reachOf(run: Run, place: Place): { m: number; node: number }
  routeTo(G: Graph, run: Run, place: Place): { m: number; pts: number[] } | null
}

const mapDir = new URL('../public/map/', import.meta.url)
// Run route.js as the browser does (a classic script that sets self.SQRoute), not through a module loader.
function loadRouter(): Router {
  const self: { SQRoute?: Router } = {}
  new Function('self', readFileSync(new URL('route.js', mapDir), 'utf8'))(self)
  return self.SQRoute!
}
const R = loadRouter()

// Hand-made graph. Map units are decimetres, so 500 units = 50 m.
//   n0 (0,0) --50 m, path--> n1 (300,400) --100 m, path--> n2 (300,1400) --100 m x1.04--> n3 (300,2400)
//   n0 --143.18 m of steps (x1.25 = 178.97)--> n2        n4 has no edges.
const toy: Data = {
  gn: [0, 0, 300, 400, 300, 1400, 300, 2400, 5000, 5000],
  ge: [0, 1, 0, 1, 2, 0, 0, 2, 3, 2, 3, 1],
}
const P: Place = { acc: [[0, 50]] }              // entrance 5 m from n0
const Q: Place = { acc: [[3, 0], [2, 300]] }     // two doors: at n3, and 30 m from n2
const nowhere: Place = { acc: [[4, 0]] }

describe('map router on a hand-made graph', () => {
  const G = R.buildGraph(toy)

  it('measures edges in metres and stretches them by path type', () => {
    expect([G.NN, G.NE]).toEqual([5, 4])
    expect(Array.from(G.elen).map(x => +x.toFixed(2))).toEqual([50, 100, 143.18, 100])
    expect(R.FACT).toEqual([1, 1.04, 1.1, 1.25, 1])
  })

  it('finds the known shortest distance to every node, avoiding the longer flight of steps', () => {
    const run = R.dijkstra(G, P)
    expect(Array.from(run.dist.slice(0, 4))).toEqual([5, 55, 155, 259])
    expect(run.dist[4]).toBe(1e9)
    expect(Array.from(run.prev)).toEqual([-1, 0, 1, 2, -1])
  })

  it('arrives by the nearer door and draws the walk back to the start', () => {
    const run = R.dijkstra(G, P)
    expect(R.reachOf(run, Q)).toEqual({ m: 185, node: 2 })
    expect(R.routeTo(G, run, Q)).toEqual({ m: 185, pts: [300, 1400, 300, 400, 0, 0] })
  })

  it('gives the same distance in both directions', () => {
    expect(R.reachOf(R.dijkstra(G, Q), P).m).toBe(185)
  })

  it('starts from whichever door of a place is closer', () => {
    const both: Place = { acc: [[0, 0], [3, 0]] }
    expect(R.dijkstra(G, both).dist[2]).toBe(104)
  })

  it('returns null when no path reaches the place', () => {
    expect(R.routeTo(G, R.dijkstra(G, P), nowhere)).toBeNull()
  })
})

describe('map router against a brute-force shortest path', () => {
  it('matches Bellman-Ford on 40 random graphs', () => {
    let seed = 11
    const rand = (k: number) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % k }
    for (let g = 0; g < 40; g++) {
      const n = 8 + rand(30), gn: number[] = [], ge: number[] = []
      for (let i = 0; i < n; i++) gn.push(rand(4000), rand(4000))
      for (let e = 0, m = n + rand(3 * n); e < m; e++) ge.push(rand(n), rand(n), rand(5))
      const G = R.buildGraph({ gn, ge })
      const start = rand(n), offset = rand(200)
      const run = R.dijkstra(G, { acc: [[start, offset]] })
      const want = new Array(n).fill(1e9)
      want[start] = offset / 10
      for (let pass = 0; pass < n; pass++) {
        for (let e = 0; e < ge.length / 3; e++) {
          const a = ge[3 * e], b = ge[3 * e + 1], w = G.elen[e] * R.FACT[ge[3 * e + 2]]
          if (want[a] + w < want[b]) want[b] = want[a] + w
          if (want[b] + w < want[a]) want[a] = want[b] + w
        }
      }
      for (let i = 0; i < n; i++) expect(run.dist[i], `graph ${g} node ${i}`).toBeCloseTo(want[i], 6)
    }
  })
})

describe('map router on the real campus data', () => {
  const D = JSON.parse(readFileSync(new URL('data.json', mapDir), 'utf8')) as Data
  const G = R.buildGraph(D)
  const places = (D.places ?? []).filter(p => Array.isArray(p.acc) && p.acc.length)
  const metres = (from: string, to: string) => {
    const a = places.find(p => p.label === from)!, b = places.find(p => p.label === to)!
    return Math.round(R.reachOf(R.dijkstra(G, a), b).m)
  }

  it('gives the known walking distances between named places', () => {
    expect(metres('Mission Church', 'Adobe Lodge')).toBe(27)
    expect(metres('Mission Church', 'Nobili')).toBe(30)
    expect(metres('Adobe Lodge', 'Mission Church')).toBe(27)
  })

  it('agrees with the walk table built by the separate generator, for every pair of places', () => {
    expect(places.map(p => p.label)).toEqual(WALK_PLACES.map(p => p.label))
    // The generator keeps edge lengths in 64-bit floats and the map in 32-bit ones, so a distance
    // that lands on .5 m may round either way: allow half a metre plus float noise, nothing more.
    const n = places.length, off: string[] = []
    for (let i = 0; i < n; i++) {
      const run = R.dijkstra(G, places[i])
      for (let j = 0; j < n; j++) {
        const m = i === j ? 0 : R.reachOf(run, places[j]).m, want = WALK_METRES[i * n + j]
        const ok = want === -1 ? m >= 1e8 : m < 1e8 && Math.abs(m - want) <= 0.5 + 1e-3
        if (!ok) off.push(`${places[i].label} to ${places[j].label}: ${m.toFixed(2)} m, table ${want}`)
      }
    }
    expect(off).toEqual([])
  })

  it('is the router the map page runs', () => {
    const html = readFileSync(new URL('index.html', mapDir), 'utf8')
    const src = html.indexOf('<script src="route.js"></script>'), inline = html.indexOf('<script>\n(async function(){')
    expect(src).toBeGreaterThan(-1)
    expect(src).toBeLessThan(inline)
    expect(html).toContain('function dijkstra(place){return SQRoute.dijkstra(RG,place);}')
    expect(html).not.toMatch(/const pop=\(\)=>\{const t=heap\[0\]/)
  })
})
