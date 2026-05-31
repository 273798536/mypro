export type DataSourceType = 'channel_bill' | 'game_order' | 'refund_record';
export type AnomalyType = 'cross_server_refund' | 'rate_version_mismatch' | 'duplicate_deduction';
export type Severity = 'critical' | 'warning' | 'info';
export type OperationType = 'upload' | 'update' | 'delete' | 'calculate' | 'export' | 'adjust';
export type VersionStatus = 'active' | 'archived' | 'draft';
export type CollectionStatus = 'matched' | 'mismatch' | 'pending';
export type AnomalyStatus = 'open' | 'confirmed' | 'resolved' | 'ignored';
export type TraceNodeType = 'datasource' | 'collection' | 'revenue' | 'adjustment' | 'deduction';
export type Channel = 'apple' | 'google' | 'taptap' | 'huawei' | 'xiaomi' | 'oppo' | 'vivo' | 'steam' | 'epic';

export const CHANNEL_LABELS: Record<Channel, string> = {
  apple: 'App Store',
  google: 'Google Play',
  taptap: 'TapTap',
  huawei: '华为应用市场',
  xiaomi: '小米应用商店',
  oppo: 'OPPO 软件商店',
  vivo: 'vivo 应用商店',
  steam: 'Steam',
  epic: 'Epic Games',
};

export const ANOMALY_TYPE_LABELS: Record<AnomalyType, string> = {
  cross_server_refund: '跨服退款',
  rate_version_mismatch: '费率版本错配',
  duplicate_deduction: '抵扣重复',
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  critical: '严重',
  warning: '警告',
  info: '提示',
};

export const ANOMALY_STATUS_LABELS: Record<AnomalyStatus, string> = {
  open: '待处理',
  confirmed: '已确认',
  resolved: '已解决',
  ignored: '已忽略',
};

export const OPERATION_TYPE_LABELS: Record<OperationType, string> = {
  upload: '上传',
  update: '更新',
  delete: '删除',
  calculate: '计算',
  export: '导出',
  adjust: '调整',
};

export interface DataSourceBase {
  id: string;
  type: DataSourceType;
  source: string;
  version: string;
  versionStatus: VersionStatus;
  uploadTime: string;
  uploadBy: string;
  period: string;
  remark?: string;
}

export interface ChannelBill extends DataSourceBase {
  type: 'channel_bill';
  channel: Channel;
  gameId: string;
  gameName: string;
  orderNo: string;
  amount: number;
  currency: string;
  transactionTime: string;
  channelFee: number;
  channelOrderNo: string;
}

export interface GameOrder extends DataSourceBase {
  type: 'game_order';
  gameId: string;
  gameName: string;
  serverId: string;
  serverName: string;
  orderNo: string;
  userId: string;
  amount: number;
  currency: string;
  payTime: string;
  itemId: string;
  itemName: string;
  channel: Channel;
  channelOrderNo?: string;
}

export interface RefundRecord extends DataSourceBase {
  type: 'refund_record';
  refundNo: string;
  originalOrderNo: string;
  gameId: string;
  gameName: string;
  serverId: string;
  serverName: string;
  userId: string;
  amount: number;
  currency: string;
  refundTime: string;
  refundReason: string;
  channel: Channel;
}

export interface RateVersion {
  id: string;
  version: string;
  channel: Channel;
  gameId: string;
  gameName: string;
  effectiveStart: string;
  effectiveEnd: string;
  channelRate: number;
  platformRate: number;
  developerRate: number;
  isActive: boolean;
  createTime: string;
  createBy: string;
}

export interface OrderCollection {
  id: string;
  collectionNo: string;
  period: string;
  gameId: string;
  gameName: string;
  channel: Channel;
  originalOrderIds: string[];
  refundIds: string[];
  grossAmount: number;
  refundAmount: number;
  netAmount: number;
  matchRule: string;
  matchConfidence: number;
  createTime: string;
  status: CollectionStatus;
  remark?: string;
}

export interface RevenueResult {
  id: string;
  period: string;
  gameId: string;
  gameName: string;
  channel: Channel;
  collectionId: string;
  rateVersionId: string;
  grossAmount: number;
  refundAmount: number;
  channelFee: number;
  platformShare: number;
  developerShare: number;
  calculationFormula: string;
  createTime: string;
  hasAnomaly: boolean;
  anomalyIds: string[];
  adjustments?: Array<{
    id: string;
    amount: number;
    reason: string;
    operator: string;
    time: string;
  }>;
  deductions?: Array<{
    id: string;
    amount: number;
    reason: string;
    operator: string;
    time: string;
    rollback?: boolean;
  }>;
}

export interface AnomalyRecord {
  id: string;
  type: AnomalyType;
  severity: Severity;
  period: string;
  description: string;
  affectedResultIds: string[];
  affectedCollectionIds: string[];
  sourceDataIds: string[];
  detail: Record<string, any>;
  detectedTime: string;
  status: AnomalyStatus;
  handledBy?: string;
  handledTime?: string;
  handleRemark?: string;
}

export interface AuditLog {
  id: string;
  operationType: OperationType;
  operator: string;
  operateTime: string;
  module: string;
  resourceId: string;
  resourceType: string;
  beforeChange?: any;
  afterChange?: any;
  changeReason?: string;
  ip?: string;
}

export interface TraceNode {
  id: string;
  type: TraceNodeType;
  title: string;
  data: any;
  timestamp: string;
  operator?: string;
  description?: string;
}

export interface TraceChain {
  resultId: string;
  nodes: TraceNode[];
  edges: Array<{ from: string; to: string; label?: string }>;
}

export interface MatchRule {
  fields: string[];
  tolerance: number;
  timeWindow: number;
}

export interface MatchResult {
  confidence: number;
  matchedPairs: Array<{
    channelBill: ChannelBill;
    gameOrder: GameOrder;
    matchScore: number;
    matchFields: string[];
  }>;
  unmatched: {
    channelBills: ChannelBill[];
    gameOrders: GameOrder[];
  };
}

export interface DetectionRule {
  type: AnomalyType;
  enabled: boolean;
  config: Record<string, any>;
}

export interface ImpactAnalysis {
  affectedCount: number;
  affectedAmount: number;
  affectedItems: RevenueResult[];
  affectedCollections: OrderCollection[];
}

export interface PeriodSummary {
  period: string;
  totalOrders: number;
  totalAmount: number;
  totalRefunds: number;
  refundAmount: number;
  netAmount: number;
  channelFee: number;
  platformShare: number;
  developerShare: number;
  anomalyCount: number;
  pendingAnomalies: number;
  status: 'draft' | 'calculating' | 'completed' | 'has_anomaly';
}

export interface DashboardStats {
  currentPeriod: PeriodSummary;
  previousPeriod: PeriodSummary;
  anomalyTrend: Array<{ period: string; count: number }>;
  revenueTrend: Array<{ period: string; amount: number; type: string }>;
  anomalyByType: Array<{ type: string; count: number; severity: string }>;
  channelDistribution: Array<{ channel: string; amount: number; percentage: number }>;
}

export interface UploadResult {
  success: boolean;
  total: number;
  inserted: number;
  updated: number;
  errors: Array<{ row: number; message: string }>;
  version: string;
}
