export interface CommunityResult {
  id: string
  nodes: string[]
  modularity: number
  density: number
  score: 'A' | 'B' | 'C' | 'D'
}

function buildAdjacencyMatrix(
  nodeIds: string[],
  edges: Array<{ source: string; target: string; weight: number }>,
  similarityThreshold: number,
  weightDecay: number
): { adj: number[][]; filteredEdges: Array<{ source: string; target: string; weight: number }> } {
  const n = nodeIds.length
  const indexMap = new Map<string, number>()
  nodeIds.forEach((id, i) => indexMap.set(id, i))

  const adj: number[][] = Array.from({ length: n }, () => new Array(n).fill(0))
  const filteredEdges = edges.filter(e => e.weight >= similarityThreshold)

  for (const e of filteredEdges) {
    const i = indexMap.get(e.source)
    const j = indexMap.get(e.target)
    if (i !== undefined && j !== undefined) {
      const w = e.weight * weightDecay
      adj[i][j] += w
      adj[j][i] += w
    }
  }

  return { adj, filteredEdges }
}

function computeNormalizedLaplacian(adj: number[][]): number[][] {
  const n = adj.length
  const degree = new Array(n).fill(0)

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      degree[i] += adj[i][j]
    }
  }

  const dInvSqrt = degree.map(d => (d > 0 ? 1 / Math.sqrt(d) : 0))

  const L: number[][] = Array.from({ length: n }, () => new Array(n).fill(0))

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        L[i][j] = degree[i] > 0 ? 1 : 0
      } else if (degree[i] > 0 && degree[j] > 0) {
        L[i][j] = -adj[i][j] * dInvSqrt[i] * dInvSqrt[j]
      }
    }
  }

  return L
}

function jacobiEigen(
  matrix: number[][],
  maxIter: number = 200
): { eigenvalues: number[]; eigenvectors: number[][] } {
  const n = matrix.length
  if (n === 0) return { eigenvalues: [], eigenvectors: [] }
  if (n === 1) return { eigenvalues: [matrix[0][0]], eigenvectors: [[1]] }

  const A = matrix.map(row => [...row])
  const V: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  )

  const totalIter = Math.max(maxIter, 10 * n * n)

  for (let iter = 0; iter < totalIter; iter++) {
    let maxVal = 0
    let p = 0
    let q = 1

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (Math.abs(A[i][j]) > maxVal) {
          maxVal = Math.abs(A[i][j])
          p = i
          q = j
        }
      }
    }

    if (maxVal < 1e-12) break

    const app = A[p][p]
    const aqq = A[q][q]
    const apq = A[p][q]

    const tau = Math.abs(app - aqq) < 1e-15
      ? 1
      : (aqq - app) / (2 * apq)

    const t = tau >= 0
      ? 1 / (tau + Math.sqrt(1 + tau * tau))
      : -1 / (-tau + Math.sqrt(1 + tau * tau))

    const c = 1 / Math.sqrt(1 + t * t)
    const s = t * c

    for (let i = 0; i < n; i++) {
      if (i !== p && i !== q) {
        const aip = A[i][p]
        const aiq = A[i][q]
        A[i][p] = c * aip - s * aiq
        A[p][i] = A[i][p]
        A[i][q] = s * aip + c * aiq
        A[q][i] = A[i][q]
      }
    }

    A[p][p] = c * c * app - 2 * s * c * apq + s * s * aqq
    A[q][q] = s * s * app + 2 * s * c * apq + c * c * aqq
    A[p][q] = 0
    A[q][p] = 0

    for (let i = 0; i < n; i++) {
      const vip = V[i][p]
      const viq = V[i][q]
      V[i][p] = c * vip - s * viq
      V[i][q] = s * vip + c * viq
    }
  }

  const eigenvalues = A.map((_, i) => A[i][i])
  return { eigenvalues, eigenvectors: V }
}

function kMeans(data: number[][], k: number, maxIter: number = 50): number[] {
  const n = data.length
  if (n === 0) return []
  if (k <= 1) return new Array(n).fill(0)

  const dim = data[0].length
  const chosen = new Set<number>()
  while (chosen.size < Math.min(k, n)) {
    chosen.add(Math.floor(Math.random() * n))
  }
  const centroids = Array.from(chosen).map(i => [...data[i]])

  let assignments = new Array(n).fill(0)

  for (let iter = 0; iter < maxIter; iter++) {
    const newAssignments = data.map(point => {
      let minDist = Infinity
      let best = 0
      for (let ci = 0; ci < centroids.length; ci++) {
        let dist = 0
        for (let dIdx = 0; dIdx < dim; dIdx++) {
          dist += (point[dIdx] - centroids[ci][dIdx]) ** 2
        }
        if (dist < minDist) {
          minDist = dist
          best = ci
        }
      }
      return best
    })

    if (newAssignments.every((a, i) => a === assignments[i])) break
    assignments = newAssignments

    for (let ci = 0; ci < centroids.length; ci++) {
      const members: number[][] = []
      for (let i = 0; i < n; i++) {
        if (assignments[i] === ci) members.push(data[i])
      }
      if (members.length > 0) {
        for (let dIdx = 0; dIdx < dim; dIdx++) {
          centroids[ci][dIdx] = members.reduce((sum, m) => sum + m[dIdx], 0) / members.length
        }
      }
    }
  }

  return assignments
}

function computeModularity(
  adj: number[][],
  assignments: number[]
): number {
  const n = adj.length
  const degree = new Array(n).fill(0)
  let m = 0

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      degree[i] += adj[i][j]
    }
  }
  m = degree.reduce((s, d) => s + d, 0) / 2

  if (m === 0) return 0

  let Q = 0
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (assignments[i] === assignments[j]) {
        Q += adj[i][j] - (degree[i] * degree[j]) / (2 * m)
      }
    }
  }

  return Q / (2 * m)
}

function computeDensity(
  nodes: string[],
  edges: Array<{ source: string; target: string; weight: number }>
): number {
  const nodeSet = new Set(nodes)
  const internalEdges = edges.filter(e => nodeSet.has(e.source) && nodeSet.has(e.target))
  const numNodes = nodes.length
  if (numNodes <= 1) return 0
  return (2 * internalEdges.length) / (numNodes * (numNodes - 1))
}

function getScore(density: number): 'A' | 'B' | 'C' | 'D' {
  if (density >= 0.6) return 'A'
  if (density >= 0.4) return 'B'
  if (density >= 0.2) return 'C'
  return 'D'
}

export function spectralCluster(
  nodeIds: string[],
  edges: Array<{ source: string; target: string; weight: number }>,
  params: { k: number; similarityThreshold: number; weightDecay: number }
): CommunityResult[] {
  const { k, similarityThreshold, weightDecay } = params
  const n = nodeIds.length

  if (n === 0) return []

  const { adj, filteredEdges } = buildAdjacencyMatrix(nodeIds, edges, similarityThreshold, weightDecay)

  const degree = adj.map(row => row.reduce((s, v) => s + v, 0))
  const isolatedIndices: number[] = []
  const nonIsolatedIndices: number[] = []
  for (let i = 0; i < n; i++) {
    if (degree[i] === 0) {
      isolatedIndices.push(i)
    } else {
      nonIsolatedIndices.push(i)
    }
  }

  if (nonIsolatedIndices.length === 0) {
    return nodeIds.map((id, i) => ({
      id: `community-${i}`,
      nodes: [id],
      modularity: 0,
      density: 0,
      score: 'D' as const
    }))
  }

  const subN = nonIsolatedIndices.length
  const effectiveK = Math.min(k, subN)

  const subAdj: number[][] = Array.from({ length: subN }, () => new Array(subN).fill(0))
  for (let i = 0; i < subN; i++) {
    for (let j = 0; j < subN; j++) {
      subAdj[i][j] = adj[nonIsolatedIndices[i]][nonIsolatedIndices[j]]
    }
  }

  const subAssignments = (() => {
    if (subN <= effectiveK) {
      return nonIsolatedIndices.map((_, i) => i)
    }

    const L = computeNormalizedLaplacian(subAdj)
    const { eigenvalues, eigenvectors } = jacobiEigen(L)

    const sortedIndices = eigenvalues
      .map((v, i) => ({ v, i }))
      .sort((a, b) => a.v - b.v)
      .map(x => x.i)

    const kEigvecs = sortedIndices.slice(0, effectiveK).map(si => {
      const col: number[] = []
      for (let i = 0; i < subN; i++) {
        col.push(eigenvectors[i][si])
      }
      return col
    })

    const embeddings: number[][] = nonIsolatedIndices.map((_, i) =>
      kEigvecs.map(ev => ev[i])
    )

    for (let i = 0; i < embeddings.length; i++) {
      const norm = Math.sqrt(embeddings[i].reduce((s, v) => s + v * v, 0))
      if (norm > 1e-10) {
        embeddings[i] = embeddings[i].map(v => v / norm)
      }
    }

    return kMeans(embeddings, effectiveK)
  })()

  const fullAssignments = new Array(n).fill(-1)
  isolatedIndices.forEach((idx, i) => {
    fullAssignments[idx] = effectiveK + i
  })
  nonIsolatedIndices.forEach((idx, i) => {
    fullAssignments[idx] = subAssignments[i]
  })

  const modularity = computeModularity(adj, fullAssignments)

  const communityMap = new Map<number, string[]>()
  fullAssignments.forEach((c, i) => {
    if (!communityMap.has(c)) communityMap.set(c, [])
    communityMap.get(c)!.push(nodeIds[i])
  })

  const results: CommunityResult[] = []
  let communityId = 0

  const sortedCommunities = Array.from(communityMap.entries()).sort((a, b) => a[0] - b[0])
  for (const [, nodes] of sortedCommunities) {
    const density = computeDensity(nodes, filteredEdges)
    results.push({
      id: `community-${communityId}`,
      nodes,
      modularity,
      density,
      score: getScore(density)
    })
    communityId++
  }

  return results
}
