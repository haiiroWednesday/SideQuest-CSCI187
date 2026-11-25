/* Campus walking router, shared by the map page (map/index.html loads it before its own script)
   and the Vitest tests (tests/map.route.test.ts), so the tests run the same code students use.
   Moved here unchanged from map/index.html. Distances are metres along OpenStreetMap paths
   (map units / 10), each edge stretched by its path-type factor. Not checked on foot.
   D.gn: node x,y pairs. D.ge: edge triples (node a, node b, path type).
   place.acc: [node, entrance offset in map units] pairs. */
(function (root) {
  'use strict';
  /* path-type factors, by D.ge[3*e+2] */
  const FACT = [1, 1.04, 1.1, 1.25, 1];

  function buildGraph(D) {
    const NN = D.gn.length / 2, NE = D.ge.length / 3;
    const elen = new Float32Array(NE), deg = new Int32Array(NN + 1);
    for (let e = 0; e < NE; e++) { const a = D.ge[3 * e], b = D.ge[3 * e + 1]; elen[e] = Math.hypot(D.gn[2 * a] - D.gn[2 * b], D.gn[2 * a + 1] - D.gn[2 * b + 1]) / 10; deg[a + 1]++; deg[b + 1]++; }
    for (let i = 0; i < NN; i++) deg[i + 1] += deg[i];
    const adjN = new Int32Array(2 * NE), adjE = new Int32Array(2 * NE), fillp = deg.slice(0, NN);
    for (let e = 0; e < NE; e++) { const a = D.ge[3 * e], b = D.ge[3 * e + 1]; adjN[fillp[a]] = b; adjE[fillp[a]++] = e; adjN[fillp[b]] = a; adjE[fillp[b]++] = e; }
    return { D, NN, NE, FACT, elen, deg, adjN, adjE };
  }

  /* Shortest walk from every node to the place (dist in metres, prev = next node toward the place). */
  function dijkstra(G, place) {
    const { D, NN, elen, deg, adjN, adjE } = G;
    const dist = new Float64Array(NN).fill(1e9), prev = new Int32Array(NN).fill(-1), heap = [];
    const push = (d, n) => { heap.push([d, n]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const t = heap[0], l = heap.pop(); if (heap.length) { heap[0] = l; let i = 0; for (;;) { let a = 2 * i + 1, b = a + 1, m = i; if (a < heap.length && heap[a][0] < heap[m][0]) m = a; if (b < heap.length && heap[b][0] < heap[m][0]) m = b; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return t; };
    for (const [n, g] of place.acc) { const d = g / 10; if (d < dist[n]) { dist[n] = d; push(d, n); } }
    while (heap.length) { const [d, n] = pop(); if (d > dist[n]) continue; for (let k = deg[n]; k < deg[n + 1]; k++) { const m = adjN[k], e = adjE[k], nd = d + elen[e] * FACT[D.ge[3 * e + 2]]; if (nd < dist[m]) { dist[m] = nd; prev[m] = n; push(nd, m); } } }
    return { dist, prev };
  }

  /* Metres from a run's place to this place, and the entrance node it arrives at. */
  function reachOf(run, place) { let best = 1e9, node = -1; for (const [n, g] of place.acc) { const d = run.dist[n] + g / 10; if (d < best) { best = d; node = n; } } return { m: best, node }; }

  /* The walk as map points, from this place back to the run's place; null when unreachable. */
  function routeTo(G, run, place) { const D = G.D; const r = reachOf(run, place); if (r.node < 0 || r.m >= 1e8) return null; const pts = []; let n = r.node; while (n >= 0) { pts.push(D.gn[2 * n], D.gn[2 * n + 1]); n = run.prev[n]; } return { m: r.m, pts }; }

  root.SQRoute = { FACT, buildGraph, dijkstra, reachOf, routeTo };
})(typeof self !== 'undefined' ? self : globalThis);
