export type AttributeStatus = 'pass' | 'warning' | 'fail' | 'pending';

export type ExceptionStatus = 'handled' | 'pending_material' | 'manual_overruled';

export type ProcessAction = 'auto_pass' | 'auto_warning' | 'auto_fail' | 'manual_pass' | 'manual_fail' | 'pending_review' | 'material_requested' | 'overruled_pass' | 'overruled_fail';

export interface ModelRawOutput {
  modelVersion: string;
  inferenceTime: string;
  attributeScores: Record<string, number>;
  attributeLabels: Record<string, string>;
  confidence: Record<string, number>;
  rawText: string;
  thresholdsApplied: Record<string, {
    pass: number;
    warning: number;
    actualValue: number;
    driftComparedTo?: string;
  }>;
}

export interface ProcessLog {
  id: string;
  timestamp: string;
  operator: string;
  action: ProcessAction;
  actionLabel: string;
  comment?: string;
  fromStatus: AttributeStatus | '';
  toStatus: AttributeStatus;
  evidenceRef?: string[];
}

export interface ProductRecord {
  id: string;
  productId: string;
  productName: string;
  category: string;
  brand: string;
  batchDate: string;
  evaluator: string;
  overallStatus: AttributeStatus;
  overallScore: number;
  attributes: {
    name: string;
    score: number;
    label: string;
    status: AttributeStatus;
    weight: number;
    thresholdPass: number;
    thresholdWarning: number;
  }[];
  modelOutput: ModelRawOutput;
  processLogs: ProcessLog[];
  finalConclusion: {
    status: AttributeStatus;
    conclusionText: string;
    decidedAt: string;
    decidedBy: string;
    isManualOverride: boolean;
  };
  exceptionStatus?: ExceptionStatus;
  exceptionNote?: string;
  influentialWeight: number;
}

export interface ThresholdRule {
  attributeName: string;
  pass: number;
  warning: number;
  weight: number;
  category: string;
  version: string;
  effectiveFrom: string;
  changeLog: {
    version: string;
    date: string;
    changedBy: string;
    fromPass: number;
    toPass: number;
    fromWarning: number;
    toWarning: number;
    reason: string;
  }[];
}

export interface FilterConditions {
  dateRange: [string, string] | null;
  categories: string[];
  brands: string[];
  statuses: AttributeStatus[];
  evaluators: string[];
  keyword: string;
  attributeName?: string;
  attributeStatus?: AttributeStatus;
}

export interface DashboardStats {
  total: number;
  passCount: number;
  warningCount: number;
  failCount: number;
  pendingCount: number;
  passRate: number;
  avgScore: number;
  manualOverrideCount: number;
  exceptionCounts: {
    handled: number;
    pending_material: number;
    manual_overruled: number;
  };
  categoryBreakdown: {
    category: string;
    total: number;
    pass: number;
    warning: number;
    fail: number;
  }[];
  attributeBreakdown: {
    attribute: string;
    pass: number;
    warning: number;
    fail: number;
    avgScore: number;
  }[];
  trendData: {
    date: string;
    pass: number;
    warning: number;
    fail: number;
  }[];
  influentialRecords: {
    id: string;
    productName: string;
    score: number;
    weight: number;
    impactOnOverall: number;
    reason: string;
  }[];
}
