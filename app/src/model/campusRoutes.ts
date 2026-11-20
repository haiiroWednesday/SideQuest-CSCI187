// MODEL: shortest safe walk on an *audited* campus pedestrian graph.
// Do not infer walkability from straight-line building coordinates or estimate
// real travel time. No production graph is bundled until paths are verified.

export type CampusNode = {
  id: string
  label: string
}

export type CampusWalkway = {
  from: string
  to: string
  distanceMeters: number
  accessible: boolean
  closed: boolean
  /** Verifiable survey or official source. An unverified edge is never routed. */
  verified: boolean
  evidence: string
}

export type CampusPedestrianGraph = {
  nodes: readonly CampusNode[]
  walkways: readonly CampusWalkway[]
}

export type CampusRouteResult =
  | { status: 'ready'; nodeIds: string[]; distanceMeters: number }
  | { status: 'unavailable'; reason: 'unknown-place' | 'unverified-map' | 'no-walkable-route' | 'invalid-graph' }

const comparePath = (a: string[], b: string[]) => a.join('\u0000').localeCompare(b.join('\u0000'))

export function findCampusWalk(
  graph: CampusPedestrianGraph,
  startId: string,
  finishId: string,
  options: { accessibleOnly?: boolean } = {},
): CampusRouteResult {
  const nodes = new Set<string>()
  for (const node of graph.nodes) {
    if (!node.id.trim() || !node.label.trim() || nodes.has(node.id)) {
      return { status: 'unavailable', reason: 'invalid-graph' }
    }
    nodes.add(node.id)
  }
  if (!nodes.has(startId) || !nodes.has(finishId)) {
    return { status: 'unavailable', reason: 'unknown-place' }
  }
  if (startId === finishId) return { status: 'ready', nodeIds: [startId], distanceMeters: 0 }

  type Link = { destination: string; meters: number }
  const adjacency = new Map([...nodes].map(id => [id, [] as Link[]]))
  let verifiedEdges = 0
  for (const edge of graph.walkways) {
    if (!nodes.has(edge.from) || !nodes.has(edge.to) || edge.from === edge.to) {
      return { status: 'unavailable', reason: 'invalid-graph' }
    }
    if (!Number.isFinite(edge.distanceMeters) || edge.distanceMeters <= 0 || edge.distanceMeters > 20_000) {
      return { status: 'unavailable', reason: 'invalid-graph' }
    }
    if (!edge.verified || !edge.evidence.trim()) continue
    verifiedEdges++
    if (edge.closed || (options.accessibleOnly && !edge.accessible)) continue
    adjacency.get(edge.from)!.push({ destination: edge.to, meters: edge.distanceMeters })
    adjacency.get(edge.to)!.push({ destination: edge.from, meters: edge.distanceMeters })
  }
  if (!verifiedEdges) return { status: 'unavailable', reason: 'unverified-map' }

  const distance = new Map([[startId, 0]])
  const paths = new Map([[startId, [startId]]])
  const visited = new Set<string>()
  while (visited.size < nodes.size) {
    let current: string | null = null
    for (const id of nodes) {
      if (visited.has(id) || !distance.has(id)) continue
      if (current === null || distance.get(id)! < distance.get(current)! ||
        (distance.get(id) === distance.get(current) && comparePath(paths.get(id)!, paths.get(current)!) < 0)) {
        current = id
      }
    }
    if (current === null) break
    if (current === finishId) {
      return { status: 'ready', nodeIds: paths.get(current)!, distanceMeters: distance.get(current)! }
    }
    visited.add(current)
    for (const link of adjacency.get(current)!) {
      if (visited.has(link.destination)) continue
      const proposedDistance = distance.get(current)! + link.meters
      const proposedPath = [...paths.get(current)!, link.destination]
      const previousDistance = distance.get(link.destination)
      if (previousDistance === undefined || proposedDistance < previousDistance ||
        (proposedDistance === previousDistance && comparePath(proposedPath, paths.get(link.destination)!) < 0)) {
        distance.set(link.destination, proposedDistance)
        paths.set(link.destination, proposedPath)
      }
    }
  }
  return { status: 'unavailable', reason: 'no-walkable-route' }
}
