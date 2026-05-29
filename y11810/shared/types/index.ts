export interface TraceContext {
  traceId: string;
  operatorId: string;
  operatorName: string;
  action: string;
  timestamp: number;
}

export interface Channel extends Record<string, unknown> {
  id: string;
  name: string;
  account: string;
  rate: number;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface RateHistory {
  id: string;
  channelId: string;
  oldRate: number;
  newRate: number;
  effectiveDate: string;
  reason: string;
  operator: string;
  createdAt: string;
}

export interface ImpressionLog {
  id: string;
  channelId: string;
  requestId: string;
  userId?: string;
  ip: string;
  userAgent: string;
  impressionTime: string;
  createdAt: string;
}

export interface ClickLog {
  id: string;
  channelId: string;
  requestId: string;
  impressionId?: string;
  userId?: string;
  ip: string;
  userAgent: string;
  clickTime: string;
  isAnomaly: boolean;
  anomalyReason?: string;
  createdAt: string;
}

export interface ConversionOrder {
  id: string;
  channelId: string;
  orderNo: string;
  clickId?: string;
  userId?: string;
  amount: number;
  conversionTime: string;
  isDuplicate: boolean;
  duplicateReason?: string;
  createdAt: string;
}

export interface DeductionRule {
  id: string;
  name: string;
  type: 'click_anomaly' | 'duplicate_conversion' | 'ip_fraud' | 'time_abnormal' | 'custom';
  condition: string;
  deductionRate: number;
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SettlementRun {
  id: string;
  batchNo: string;
  channelId: string;
  startDate: string;
  endDate: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  totalAmount: number;
  deductionAmount: number;
  finalAmount: number;
  baseRunId?: string;
  createdAt: string;
  completedAt?: string;
}

export interface SettlementDetail {
  id: string;
  runId: string;
  conversionId: string;
  impressionId?: string;
  clickId?: string;
  channelId: string;
  amount: number;
  rate: number;
  commission: number;
  deductions: DeductionItem[];
  finalCommission: number;
  attributionTrace: AttributionNode[];
  rateSnapshot: RateHistory;
  createdAt: string;
}

export interface DeductionItem {
  id: string;
  ruleId: string;
  ruleName: string;
  ruleVersion: number;
  amount: number;
  reason: string;
}

export interface AttributionNode {
  type: 'impression' | 'click' | 'conversion';
  recordId: string;
  timestamp: string;
  ip: string;
  matched: boolean;
}

export interface ExceptionRecord {
  id: string;
  type: 'click_missing' | 'click_anomaly' | 'duplicate_conversion' | 'rule_change' | 'data_inconsistency';
  level: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  suggestion: string;
  affectedCount: number;
  affectedRunIds: string[];
  status: 'pending' | 'processing' | 'resolved' | 'ignored';
  handledBy?: string;
  handledAt?: string;
  handleNote?: string;
  createdAt: string;
  traceId?: string;
}

export interface ActionLog {
  id: string;
  traceId: string;
  operatorId: string;
  operatorName: string;
  action: string;
  resourceType: string;
  resourceId: string;
  beforeState?: any;
  afterState?: any;
  ip: string;
  userAgent: string;
  timestamp: string;
}

export interface DiffResult {
  field: string;
  oldValue: any;
  newValue: any;
  changeType: 'added' | 'removed' | 'modified';
  reason?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  traceId?: string;
  timestamp: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
