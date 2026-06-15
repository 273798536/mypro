import { TaskStatus, RiskLevel, QualityIssue, DataStatus } from './common';

export { TaskStatus, RiskLevel };

export interface Task {
  id: string;
  name: string;
  uploadedAt: Date;
  uploadedBy: string;
  status: TaskStatus;
  qualityScore: number;
  riskLevel: RiskLevel;
  description: string;
  farmName: string;
  dateRange: {
    start: Date;
    end: Date;
  };
  statistics: {
    totalRecords: number;
    nullValues: number;
    duplicates: number;
    unitMixed: number;
    timezoneErrors: number;
    outOfRange: number;
  };
}

export interface QualitySummary {
  totalIssues: QualityIssue[];
  score: number;
  qualityScore: number;
  nullCount: number;
  duplicateCount: number;
  unitMismatchCount: number;
  timezoneIssueCount: number;
  statusBreakdown: Record<DataStatus, number>;
  byType: Record<string, number>;
  explanation: string;
}

export interface TaskFilters {
  status?: TaskStatus;
  riskLevel?: RiskLevel;
  search?: string;
}

export interface MapPoint {
  id: string;
  taskId: string;
  name: string;
  x: number;
  y: number;
  zone: string;
  status: DataStatus;
  tideLevel: number;
  salinity: number;
  riskScore: number;
  riskLevel: number;
  worstStatus?: DataStatus;
  dissolvedOxygen?: number;
  ph?: number;
  dataQuality?: number;
  recordCount?: number;
  issueCount?: number;
  description?: string;
}

export interface MapZone {
  id: string;
  name: string;
  pointCount: number;
  avgRiskScore: number;
  status: DataStatus;
  coordinates?: { x: number; y: number; width: number; height: number };
  labelPosition?: { x: number; y: number };
}


