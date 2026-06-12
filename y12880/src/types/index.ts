export type RiskLevel = 'high' | 'medium' | 'low';
export type DataStatus = 'available' | 'pending' | 'recollect';
export type ActionType = 'supplement' | 'adjust' | 'normal';
export type Severity = 'high' | 'medium' | 'low';
export type ConflictStatus = 'pending' | 'resolved';
export type ResolutionType = 'supplement' | 'adjust' | 'accept';

export interface RiskFactor {
  name: string;
  weight: number;
  value: number;
}

export interface RiskRecord {
  id: string;
  equipmentId: string;
  equipmentName: string;
  platformId: string;
  platformName: string;
  riskLevel: RiskLevel;
  riskScore: number;
  factors: RiskFactor[];
  action: ActionType;
  dataStatus: DataStatus;
  lastCheck: string;
  createdAt: string;
}

export interface RiskOverview {
  high: number;
  medium: number;
  low: number;
  available: number;
  pending: number;
  recollect: number;
}

export interface ConflictRecord {
  id: string;
  equipmentId: string;
  equipmentName: string;
  platformId: string;
  platformName: string;
  timestamp: string;
  tideValue: number;
  buoyValue: number;
  diffValue: number;
  diffRate: number;
  severity: Severity;
  explanation: string;
  sourceTide: { file: string; line: number; remark?: string };
  sourceBuoy: { file: string; line: number; image?: string; remark?: string };
  status: ConflictStatus;
  resolution?: string;
  resolutionRemark?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface PlatformPoint {
  id: string;
  name: string;
  lng: number;
  lat: number;
  riskLevel: RiskLevel;
  equipmentCount: number;
  description?: string;
}

export interface PlatformDetail extends PlatformPoint {
  equipment: Array<{
    id: string;
    name: string;
    type: string;
    riskLevel: RiskLevel;
    riskScore: number;
    dataStatus: DataStatus;
  }>;
}

export interface SeaLayerData {
  type: string;
  timestamp: string;
  dataPoints: Array<{ lng: number; lat: number; value: number }>;
}

export interface BatchInfo {
  id: string;
  name: string;
  status: string;
  dataCompleteness: number;
  createdAt: string;
  completedAt?: string;
}

export interface ReportSummary {
  totalEquipment: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  conflicts: number;
  dataCompleteness: number;
}

export interface ReportSection {
  title: string;
  items: Array<{
    id: string;
    content: string;
    sourceRef?: string;
    sourceType?: 'tide' | 'buoy' | 'conflict' | 'risk';
    sourceLine?: number;
    sourceFile?: string;
  }>;
}

export interface ReportDetail {
  id: string;
  batchId: string;
  title: string;
  format: string;
  generatedAt: string;
  summary: ReportSummary;
  sections: ReportSection[];
}

export interface ReportListItem {
  id: string;
  title: string;
  format: string;
  batchId: string;
  generatedAt: string;
}

export interface DatabaseStatus {
  tables: Array<{ name: string; count: number }>;
  latestBatch: string;
  totalRecords: number;
  databasePath: string;
}
