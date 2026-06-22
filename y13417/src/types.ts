export type ProblemStatus = 'pending' | 'reviewed' | 'anomaly' | 'boundary'
export type AnomalyType = 'overflow' | 'empty_set' | 'missing_unit' | 'boundary'
export type AnomalyStatus = 'pending' | 'resolved' | 'deferred'
export type EventType = 'calc_step' | 'anomaly_found' | 'review' | 'note_added'

export interface GraphNode {
  id: string
  label: string
  x: number
  y: number
  unit?: string
}

export interface GraphEdge {
  from: string
  to: string
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface Problem {
  id: string
  title: string
  description: string
  graph: GraphData
  expectedCutVertices: string[]
  submittedAnswer: string[]
  status: ProblemStatus
  createdAt: string
}

export interface CalcStep {
  id: string
  problemId: string
  stepOrder: number
  currentNode: string
  dfn: number
  low: number
  parent: string
  isCutCandidate: boolean
  anomalyType: AnomalyType | null
  note: string
}

export interface Anomaly {
  id: string
  problemId: string
  calcStepId: string
  type: AnomalyType
  description: string
  status: AnomalyStatus
  resolutionNote: string
  createdAt: string
  resolvedAt: string
}

export interface ReviewRecord {
  id: string
  problemId: string
  previousConclusion: string
  currentConclusion: string
  diffExplanation: string
  createdAt: string
}

export interface EvidenceItem {
  id: string
  problemId: string
  eventType: EventType
  description: string
  relatedCalcStepId: string
  relatedAnomalyId: string
  createdAt: string
}
