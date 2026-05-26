export interface Tag {
  id: string;
  name: string;
  color: string;
  source: string;
  createdAt: Date;
}

export interface Note {
  id: string;
  content: string;
  author: string;
  createdAt: Date;
  updatedAt: Date;
}

export type NodeStatus = 'untreated' | 'corrected' | 'pending';

export interface WalletNode {
  id: string;
  address: string;
  label: string;
  balance: number;
  txCount: number;
  firstSeen: Date;
  lastSeen: Date;
  tags: Tag[];
  notes: Note[];
  clusterId?: string;
  status: NodeStatus;
  isExchange: boolean;
  isSuspicious: boolean;
  importance: number;
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
}

export interface TransactionEdge {
  id: string;
  source: string;
  target: string;
  amount: number;
  token: string;
  timestamp: Date;
  txHash: string;
  blockNumber: number;
}

export type AnomalyType = 'cycle' | 'exchange_hub' | 'tag_conflict';
export type AnomalySeverity = 'low' | 'medium' | 'high';

export interface Anomaly {
  id: string;
  type: AnomalyType;
  description: string;
  severity: AnomalySeverity;
  relatedEntities: string[];
  resolved: boolean;
}

export interface AuditTrail {
  id: string;
  entityId: string;
  action: 'create' | 'update' | 'delete';
  field: string;
  oldValue: unknown;
  newValue: unknown;
  source: string;
  timestamp: Date;
}

export interface FilterState {
  timeRange: [Date, Date];
  amountRange: [number, number];
  selectedTags: string[];
  showExchanges: boolean;
  showSuspicious: boolean;
  minTxCount: number;
}

export interface NetworkData {
  nodes: WalletNode[];
  edges: TransactionEdge[];
  anomalies: Anomaly[];
  auditTrails: AuditTrail[];
}

export interface Cluster {
  id: string;
  name: string;
  nodeIds: string[];
  color: string;
}

export interface PathResult {
  nodes: string[];
  edges: string[];
  totalAmount: number;
}

export interface Stats {
  totalNodes: number;
  totalEdges: number;
  untreated: number;
  corrected: number;
  pending: number;
  anomalies: number;
  exchanges: number;
  suspicious: number;
}
