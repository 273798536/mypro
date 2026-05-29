export type RiskLevel = 'low' | 'medium' | 'high' | 'pending';

export type NodeType = 'normal' | 'relay' | 'risk';

export type ChainType = 'ETH' | 'BTC' | 'SOL' | 'BSC' | 'Polygon';

export type PendingType = 'internal_mislabel' | 'cross_chain_duplicate' | 'dense_cluster';

export interface WalletNode {
  id: string;
  label: string;
  chain: ChainType;
  txCount: number;
  totalAmount: number;
  riskLevel: RiskLevel;
  type: NodeType;
  isInternal: boolean;
  clusterId: number;
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
}

export interface TransferEdge {
  id: string;
  source: string;
  target: string;
  amount: number;
  token: string;
  timestamp: number;
  chain: ChainType;
  isCrossChain: boolean;
  isDuplicate: boolean;
  isInternal: boolean;
  riskLevel: RiskLevel;
  notes?: string;
  isModified?: boolean;
  originalRiskLevel?: RiskLevel;
}

export interface FilterCriteria {
  searchAddress: string;
  amountRange: [number, number];
  timeRange: [number, number];
  riskLevels: RiskLevel[];
  chains: ChainType[];
  showInternal: boolean;
  showCrossChain: boolean;
  minTxCount: number;
}

export interface PendingItem {
  id: string;
  type: PendingType;
  description: string;
  relatedNodeIds: string[];
  relatedEdgeIds: string[];
}

export interface Correction {
  id: string;
  targetType: 'node' | 'edge';
  targetId: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
  reason: string;
  timestamp: number;
  analyst: string;
}

export interface AppState {
  nodes: WalletNode[];
  edges: TransferEdge[];
  filteredNodes: WalletNode[];
  filteredEdges: TransferEdge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  filters: FilterCriteria;
  corrections: Correction[];
  originalDataSnapshot: { nodes: WalletNode[]; edges: TransferEdge[] } | null;
  isCompareMode: boolean;
  pendingItems: PendingItem[];
  showLabels: boolean;
  autoRotate: boolean;
  timelinePosition: number;
  isPlaying: boolean;
  highlightedNodeIds: string[];
  highlightedEdgeIds: string[];
}

export interface DenseCluster {
  nodeIds: string[];
  edgeIds: string[];
}
