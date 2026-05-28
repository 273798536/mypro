export type NodeType = 'warehouse' | 'transit' | 'destination' | 'source';

export interface NetworkNode {
  id: string;
  name: string;
  type: NodeType;
  x?: number;
  y?: number;
  metadata?: Record<string, any>;
}

export interface NetworkEdge {
  id: string;
  from: string;
  to: string;
  capacity: number;
  cost?: number;
  bidirectional?: boolean;
  description?: string;
  disabled?: boolean;
  disabledReason?: string;
}

export interface DemandPoint {
  id: string;
  nodeId: string;
  amount: number;
  type: 'supply' | 'demand';
}

export interface BottleneckEdge {
  edgeId: string;
  flow: number;
  capacity: number;
  utilization: number;
  impact: number;
  explanation: string;
}

export type AnomalyType = 'zero_capacity' | 'isolated_node' | 'disabled_ineffective' | 'unreachable_demand';
export type Severity = 'error' | 'warning' | 'info';

export interface Anomaly {
  type: AnomalyType;
  severity: Severity;
  targetId: string;
  message: string;
  suggestion: string;
}

export interface AnalysisResult {
  maxFlow: number;
  bottlenecks: BottleneckEdge[];
  anomalies: Anomaly[];
  edgeFlows: Record<string, number>;
  computeTime: number;
  timestamp: number;
}

export type ActionType = 'create' | 'update' | 'delete' | 'import' | 'analyze';
export type TargetType = 'node' | 'edge' | 'demand' | 'scenario';

export interface AuditLogEntry {
  id: string;
  action: ActionType;
  targetType: TargetType;
  targetId: string;
  field?: string;
  oldValue?: any;
  newValue?: any;
  timestamp: number;
  source?: string;
}

export interface Scenario {
  id: string;
  name: string;
  version: string;
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  demands: DemandPoint[];
  source: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  lastAnalysis?: AnalysisResult;
  auditLog: AuditLogEntry[];
}

export type ImportMode = 'ignore' | 'overwrite' | 'append';

export interface ImportResult {
  nodesAdded: number;
  nodesUpdated: number;
  nodesIgnored: number;
  edgesAdded: number;
  edgesUpdated: number;
  edgesIgnored: number;
  demandsAdded: number;
  demandsUpdated: number;
  demandsIgnored: number;
}
