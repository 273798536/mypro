export interface QualityReportResult {
  isolatedNodes: string[]
  noiseNodes: string[]
  missingTagNodes: string[]
  totalNodes: number
  totalEdges: number
}

export function detectIsolatedNodes(
  nodeIds: string[],
  edges: Array<{ source: string; target: string }>
): string[] {
  const connected = new Set<string>()
  for (const e of edges) {
    connected.add(e.source)
    connected.add(e.target)
  }
  return nodeIds.filter(id => !connected.has(id))
}

export function detectNoiseNodes(
  activities: Array<{ userId: string; activityType: string; timestamp: string }>,
  threshold: number
): string[] {
  const counts = new Map<string, number>()
  for (const a of activities) {
    counts.set(a.userId, (counts.get(a.userId) ?? 0) + 1)
  }
  const entries = [...counts.values()]
  if (entries.length === 0) return []
  const mean = entries.reduce((s, v) => s + v, 0) / entries.length
  const variance = entries.reduce((s, v) => s + (v - mean) ** 2, 0) / entries.length
  const std = Math.sqrt(variance)
  if (std === 0) return []
  const cutoff = mean + threshold * std
  return [...counts.entries()].filter(([, c]) => c > cutoff).map(([id]) => id)
}

export function detectMissingTagNodes(
  nodeIds: string[],
  tags: Array<{ userId: string; tags: string[] }>
): string[] {
  const tagMap = new Map<string, string[]>()
  for (const t of tags) {
    tagMap.set(t.userId, t.tags)
  }
  return nodeIds.filter(id => !tagMap.has(id) || tagMap.get(id)!.length === 0)
}

export function generateQualityReport(
  nodeIds: string[],
  edges: Array<{ source: string; target: string }>,
  tags: Array<{ userId: string; tags: string[] }>,
  activities: Array<{ userId: string; activityType: string; timestamp: string }>,
  noiseThreshold: number = 2
): QualityReportResult {
  return {
    isolatedNodes: detectIsolatedNodes(nodeIds, edges),
    noiseNodes: detectNoiseNodes(activities, noiseThreshold),
    missingTagNodes: detectMissingTagNodes(nodeIds, tags),
    totalNodes: nodeIds.length,
    totalEdges: edges.length
  }
}

export function explainImpact(
  anomalyType: 'isolated' | 'noise' | 'missing_tag',
  nodeId: string,
  communityIds: string[]
): string {
  const joined = communityIds.join(', ')
  switch (anomalyType) {
    case 'isolated':
      return `节点 ${nodeId} 为孤立节点，无法参与社群聚合，影响社群: ${joined}`
    case 'noise':
      return `节点 ${nodeId} 活动频率异常，可能导致社群边界偏移，影响社群: ${joined}`
    case 'missing_tag':
      return `节点 ${nodeId} 缺少标签数据，无法辅助社群语义标注，影响社群: ${joined}`
  }
}
