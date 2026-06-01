export interface InteractionEdge {
  source: string
  target: string
  weight: number
  timestamp: string
}

export interface UserTag {
  userId: string
  tags: string[]
}

export interface ActivityRecord {
  userId: string
  activityType: string
  timestamp: string
}

export interface DataSourceMeta {
  id: string
  fileName: string
  importTime: string
  version: string
  rowCount: number
  type: 'interaction' | 'tag' | 'activity'
}

export interface ClusterParams {
  k: number
  similarityThreshold: number
  weightDecay: number
}

export interface AnomalyRecord {
  nodeId: string
  type: 'isolated' | 'noise' | 'missing_tag'
  description: string
  affectedCommunities: string[]
}

export interface QualityReport {
  isolatedNodes: string[]
  noiseNodes: string[]
  missingTagNodes: string[]
  totalNodes: number
  totalEdges: number
}

export interface Community {
  id: string
  nodes: string[]
  modularity: number
  density: number
  score: 'A' | 'B' | 'C' | 'D'
  anomalies: AnomalyRecord[]
}

export interface ClusterResult {
  id: string
  params: ClusterParams
  communities: Community[]
  qualityReport: QualityReport
  createdAt: string
  datasetVersion: string
}

export interface TraceChain {
  resultId: string
  communityId: string
  clusterParams: ClusterParams
  clusterResultId: string
  dataSourceMetas: DataSourceMeta[]
  qualityRecords: AnomalyRecord[]
}

export interface GraphNode {
  id: string
  community: string
  anomalies: AnomalyRecord[]
  tags: string[]
  activities: ActivityRecord[]
  x?: number
  y?: number
}

export interface GraphEdge {
  source: string
  target: string
  weight: number
}
