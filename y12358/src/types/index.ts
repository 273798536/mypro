export interface RemarkHistory {
  id: string;
  content: string;
  operator: string;
  operateTime: string;
}

export interface LoadRecord {
  id: string;
  recordNo: string;
  deviceId: string;
  deviceName: string;
  loadTime: string;
  loadWeight: number;
  ratedLoad: number;
  isOverload: boolean;
  height: number;
  maxHeight: number;
  isHeightOver: boolean;
  remark: string;
  remarkHistory: RemarkHistory[];
  ledgerVersion: string;
  createTime: string;
  updateTime: string;
  status: 'pending' | 'confirmed' | 'disputed';
}

export interface OilPressurePoint {
  timestamp: string;
  pressure: number;
  temperature?: number;
}

export interface PressureAnomaly {
  id: string;
  startTime: string;
  endTime: string;
  maxPressure: number;
  minPressure: number;
  fluctuation: number;
  type: 'spike' | 'drop' | 'fluctuation' | 'over_limit';
  severity: 'low' | 'medium' | 'high';
}

export interface OilPressureSeries {
  id: string;
  deviceId: string;
  recordNo: string;
  startTime: string;
  endTime: string;
  sampleInterval: number;
  dataPoints: OilPressurePoint[];
  anomalies: PressureAnomaly[];
  ledgerVersion: string;
  importTime: string;
}

export interface DeviceLedger {
  id: string;
  deviceId: string;
  deviceName: string;
  version: string;
  versionName: string;
  ratedLoad: number;
  maxHeight: number;
  ratedPressure: number;
  pressureWarning: number;
  pressureAlarm: number;
  effectiveDate: string;
  isCurrent: boolean;
  createTime: string;
  remark: string;
}

export interface CheckItem {
  passed: boolean;
  value: number;
  threshold: number;
  detail: string;
}

export interface EvidenceItem {
  id: string;
  type: 'load_record' | 'oil_pressure' | 'maintenance_remark' | 'report';
  refId: string;
  description: string;
  timestamp: string;
  operator: string;
}

export interface CheckResult {
  id: string;
  recordNo: string;
  loadRecordId: string;
  oilPressureId: string;
  ledgerVersion: string;
  checkTime: string;
  overloadCheck: CheckItem;
  pressureCheck: CheckItem;
  heightCheck: CheckItem;
  conclusion: 'normal' | 'warning' | 'danger';
  conclusionConsistent: boolean;
  maintenanceRemark: string;
  evidenceChain: EvidenceItem[];
  operator: string;
  status: 'draft' | 'confirmed' | 'archived';
}

export interface ExportReport {
  id: string;
  reportNo: string;
  checkResultIds: string[];
  generateTime: string;
  format: 'pdf' | 'excel';
  operator: string;
  includeEvidence: boolean;
}

export type TabKey = 'overload' | 'pressure' | 'height' | 'all';
