export interface FieldMapping {
  id: string
  originalField: string
  guessedField: string
  reason: string
  status: 'pending' | 'confirmed' | 'rejected'
  confirmedAt?: string
  note?: string
}

export interface FieldMappingHistoryEntry {
  id: string
  timestamp: string
  action: string
  before?: FieldMapping
  after?: FieldMapping
  operatorNote?: string
}

export interface GraphNode {
  id: string
  label: string
  x: number
  y: number
}

export interface GraphEdge {
  source: string
  target: string
  weight?: number
}

export interface ComputationStep {
  nodeId: string
  stepType: 'init' | 'dfs_enter' | 'dfs_exit' | 'update_low' | 'check_cut'
  formula: string
  substitutedValues: string
  intermediateResult: string
  finalResult: string
  paramVersion: string
  timestamp: number
}

export interface CutVertexJudgment {
  condition: string
  actualValue: string
  threshold: string
  conclusion: 'is_cut' | 'not_cut'
  boundaryNote?: string
}

export interface NodeIntermediateValues {
  nodeId: string
  dfn: number
  low: number
  parent: string | null
  childCount: number
  visitOrder: number
  isRoot: boolean
  cutVertexJudgment: CutVertexJudgment
}

export interface ParamVersion {
  version: string
  timestamp: string
  changes: string
  rootId: string
  thresholdOffset: number
  unitScale: number
}

export interface BoundaryWarning {
  nodeId: string
  type: 'degree_one' | 'isolated' | 'root_special' | 'divide_by_zero'
  humanMessage: string
  technicalDetail?: string
}

export interface ComputationSnapshot {
  id: string
  paramVersion: ParamVersion
  steps: ComputationStep[]
  intermediates: NodeIntermediateValues[]
  cutVertices: string[]
  boundaryWarnings: BoundaryWarning[]
  createdAt: string
}

export interface SampleData {
  nodes: GraphNode[]
  edges: GraphEdge[]
  description: string
}

export const STANDARD_FIELDS: string[] = [
  'node_id', 'node_label', 'source', 'target', 'weight',
  'edge_id', 'from', 'to', 'vertex', 'neighbor', 'adjacency'
]

export const FIELD_ALIAS_MAP: Record<string, string> = {
  '节点': 'node_id', '节点编号': 'node_id', '节点ID': 'node_id', '编号': 'node_id',
  '名称': 'node_label', '标签': 'node_label', '节点名称': 'node_label',
  '起点': 'source', '起点编号': 'source', '始点': 'source', 'from_node': 'source',
  '终点': 'target', '终点编号': 'target', '末点': 'target', 'to_node': 'target',
  '权重': 'weight', '边权': 'weight', '距离': 'weight', '长度': 'weight',
  '边编号': 'edge_id', '边ID': 'edge_id',
  '邻接': 'adjacency', '相邻节点': 'neighbor', '邻居': 'neighbor',
}
