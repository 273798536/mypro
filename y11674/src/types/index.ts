export type NodeType = 'customer' | 'phone' | 'device' | 'guarantor' | 'loan' | 'investigation';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type RelationType = 'uses_phone' | 'uses_device' | 'guarantees' | 'applies_for' | 'generates' | 'related_to';
export type AnomalyType = 'duplicate_relation' | 'dense_cluster' | 'blacklist_missing' | 'high_risk_path';
export type AnomalySeverity = 'warning' | 'error' | 'info';
export type OperationType = 'select' | 'filter' | 'mark' | 'path_find' | 'export' | 'save_params' | 'load_params' | 'generate_data';

export interface BaseNode {
  id: string;
  type: NodeType;
  label: string;
  riskLevel: RiskLevel;
  isBlacklist: boolean;
  source: string;
  createdAt: string;
  position?: { x: number; y: number; z: number };
}

export interface CustomerNode extends BaseNode {
  type: 'customer';
  idCard: string;
  phone?: string;
}

export interface PhoneNode extends BaseNode {
  type: 'phone';
  number: string;
  carrier: string;
}

export interface DeviceNode extends BaseNode {
  type: 'device';
  deviceId: string;
  deviceType: string;
  ipAddress: string;
}

export interface GuarantorNode extends BaseNode {
  type: 'guarantor';
  idCard: string;
  relation: string;
}

export interface LoanNode extends BaseNode {
  type: 'loan';
  amount: number;
  status: string;
  applyTime: string;
}

export interface InvestigationNode extends BaseNode {
  type: 'investigation';
  conclusion: string;
  investigator: string;
}

export type NetworkNode = CustomerNode | PhoneNode | DeviceNode | GuarantorNode | LoanNode | InvestigationNode;

export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  relationType: RelationType;
  confidence: number;
  dataSource: string;
  createdAt: string;
  isDuplicate?: boolean;
}

export interface Anomaly {
  id: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  message: string;
  relatedNodes: string[];
  relatedEdges: string[];
  detectedAt: string;
}

export interface OperationRecord {
  id: string;
  type: OperationType;
  description: string;
  timestamp: string;
  operator: string;
}

export interface Filters {
  nodeTypes: NodeType[];
  riskLevels: RiskLevel[];
  showBlacklistOnly: boolean;
  searchQuery: string;
}

export interface ViewParams {
  autoLayout: boolean;
  showLabels: boolean;
  showEdges: boolean;
  animationEnabled: boolean;
}

export interface NetworkState {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  anomalies: Anomaly[];
  selectedNode: string | null;
  selectedPath: string[];
  pathStartNode: string | null;
  filters: Filters;
  viewParams: ViewParams;
  operationHistory: OperationRecord[];
}

export interface NetworkActions {
  setNodes: (nodes: NetworkNode[]) => void;
  setEdges: (edges: NetworkEdge[]) => void;
  setSelectedNode: (id: string | null) => void;
  setPathStartNode: (id: string | null) => void;
  setSelectedPath: (path: string[]) => void;
  setFilters: (filters: Partial<Filters>) => void;
  setViewParams: (params: Partial<ViewParams>) => void;
  toggleNodeTypeFilter: (type: NodeType) => void;
  toggleRiskLevelFilter: (level: RiskLevel) => void;
  toggleBlacklistFilter: () => void;
  setSearchQuery: (query: string) => void;
  addAnomaly: (anomaly: Anomaly) => void;
  clearAnomalies: () => void;
  addOperationRecord: (record: Omit<OperationRecord, 'id' | 'timestamp'>) => void;
  generateMockData: () => void;
  loadParams: () => void;
  saveParams: () => void;
  exportReport: () => void;
  resetView: () => void;
}

export const NODE_TYPE_COLORS: Record<NodeType, string> = {
  customer: '#a855f7',
  phone: '#06b6d4',
  device: '#f97316',
  guarantor: '#22c55e',
  loan: '#3b82f6',
  investigation: '#6b7280',
};

export const RISK_LEVEL_COLORS: Record<RiskLevel, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#ef4444',
  critical: '#dc2626',
};

export const NODE_TYPE_LABELS: Record<NodeType, string> = {
  customer: '客户',
  phone: '手机号',
  device: '设备',
  guarantor: '担保人',
  loan: '贷款申请',
  investigation: '调查结论',
};

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
  critical: '极高风险',
};

export const RELATION_TYPE_LABELS: Record<RelationType, string> = {
  uses_phone: '使用手机号',
  uses_device: '使用设备',
  guarantees: '担保',
  applies_for: '申请贷款',
  generates: '生成调查',
  related_to: '关联',
};

export const ANOMALY_TYPE_LABELS: Record<AnomalyType, string> = {
  duplicate_relation: '重复关系',
  dense_cluster: '节点过密',
  blacklist_missing: '黑名单未高亮',
  high_risk_path: '高风险路径',
};

export const DEFAULT_FILTERS: Filters = {
  nodeTypes: ['customer', 'phone', 'device', 'guarantor', 'loan', 'investigation'],
  riskLevels: ['low', 'medium', 'high', 'critical'],
  showBlacklistOnly: false,
  searchQuery: '',
};

export const DEFAULT_VIEW_PARAMS: ViewParams = {
  autoLayout: true,
  showLabels: true,
  showEdges: true,
  animationEnabled: true,
};
