import type { GraphNode, GraphEdge, Enterprise, Person, GuaranteeContract } from '../types'

const REPULSION = 120
const ATTRACTION = 0.01
const DAMPING = 0.9
const ITERATIONS = 150
const CENTER_GRAVITY = 0.005

export function computeLayout(
  enterprises: Enterprise[],
  persons: Person[],
  contracts: GuaranteeContract[]
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = []
  const personNodes: GraphNode[] = []

  const angleStep = (2 * Math.PI) / enterprises.length
  enterprises.forEach((e, i) => {
    const angle = angleStep * i
    const r = 15 + Math.random() * 5
    nodes.push({
      id: e.id,
      type: 'enterprise',
      label: e.name,
      position: [Math.cos(angle) * r, (Math.random() - 0.5) * 10, Math.sin(angle) * r],
      velocity: [0, 0, 0],
      filtered: false,
      selected: false,
      expanded: false,
    })
  })

  persons.forEach((p, i) => {
    const controlled = enterprises.filter((e) => e.controlledBy === p.id)
    if (controlled.length === 0) return
    const avgX = controlled.reduce((s, e) => s + (nodes.find((n) => n.id === e.id)?.position[0] ?? 0), 0) / controlled.length
    const avgZ = controlled.reduce((s, e) => s + (nodes.find((n) => n.id === e.id)?.position[2] ?? 0), 0) / controlled.length
    personNodes.push({
      id: p.id,
      type: 'person',
      label: p.name,
      position: [avgX, 8 + i * 3, avgZ],
      velocity: [0, 0, 0],
      filtered: false,
      selected: false,
      expanded: false,
    })
  })

  const allNodes = [...nodes, ...personNodes]

  const edges: GraphEdge[] = contracts.map((c) => ({
    id: c.id,
    source: c.guarantorId,
    target: c.guaranteedId,
    guaranteeAmount: c.guaranteeAmount,
    guaranteeType: c.guaranteeType,
    status: c.status,
    isCircular: false,
    highlighted: false,
  }))

  for (let iter = 0; iter < ITERATIONS; iter++) {
    for (let i = 0; i < allNodes.length; i++) {
      for (let j = i + 1; j < allNodes.length; j++) {
        const dx = allNodes[j].position[0] - allNodes[i].position[0]
        const dy = allNodes[j].position[1] - allNodes[i].position[1]
        const dz = allNodes[j].position[2] - allNodes[i].position[2]
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.1
        const force = REPULSION / (dist * dist)
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        const fz = (dz / dist) * force
        allNodes[i].velocity![0] -= fx
        allNodes[i].velocity![1] -= fy
        allNodes[i].velocity![2] -= fz
        allNodes[j].velocity![0] += fx
        allNodes[j].velocity![1] += fy
        allNodes[j].velocity![2] += fz
      }
    }

    for (const edge of edges) {
      const source = allNodes.find((n) => n.id === edge.source)
      const target = allNodes.find((n) => n.id === edge.target)
      if (!source || !target) continue
      const dx = target.position[0] - source.position[0]
      const dy = target.position[1] - source.position[1]
      const dz = target.position[2] - source.position[2]
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.1
      const idealDist = 12
      const force = (dist - idealDist) * ATTRACTION
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      const fz = (dz / dist) * force
      source.velocity![0] += fx
      source.velocity![1] += fy
      source.velocity![2] += fz
      target.velocity![0] -= fx
      target.velocity![1] -= fy
      target.velocity![2] -= fz
    }

    for (const node of allNodes) {
      if (node.type === 'person') {
        node.velocity![1] -= 0.05
      }
      node.velocity![0] -= node.position[0] * CENTER_GRAVITY
      node.velocity![1] -= node.position[1] * CENTER_GRAVITY
      node.velocity![2] -= node.position[2] * CENTER_GRAVITY

      node.velocity![0] *= DAMPING
      node.velocity![1] *= DAMPING
      node.velocity![2] *= DAMPING

      node.position[0] += node.velocity![0]
      node.position[1] += node.velocity![1]
      node.position[2] += node.velocity![2]
    }
  }

  return { nodes: allNodes, edges }
}

export function expandPathFromNode(
  startNodeId: string,
  edges: GraphEdge[],
  allNodes: GraphNode[],
  maxDepth: number = 4
): { pathNodes: GraphNode[]; pathEdges: GraphEdge[] } {
  const visited = new Set<string>()
  const pathNodes: GraphNode[] = []
  const pathEdges: GraphEdge[] = []

  function bfs(nodeId: string, depth: number) {
    if (depth > maxDepth || visited.has(nodeId)) return
    visited.add(nodeId)
    const node = allNodes.find((n) => n.id === nodeId)
    if (node) pathNodes.push({ ...node, expanded: true })

    for (const edge of edges) {
      if (edge.source === nodeId && !visited.has(edge.target)) {
        pathEdges.push({ ...edge, highlighted: true })
        bfs(edge.target, depth + 1)
      }
      if (edge.target === nodeId && !visited.has(edge.source)) {
        pathEdges.push({ ...edge, highlighted: true })
        bfs(edge.source, depth + 1)
      }
    }
  }

  bfs(startNodeId, 0)
  return { pathNodes, pathEdges }
}
