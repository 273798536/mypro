export type AnomalyType = 'extreme' | 'noise' | 'missing';

export type SourceType = '铭牌' | '材料报告' | '操作日志';

export type ChangeType = '初始' | '补充' | '修正';

export interface Evidence {
  id: string;
  sourceName: string;
  sourceType: SourceType;
  content: string;
  lineNumber: number;
}

export interface AnomalyInfo {
  id: string;
  type: AnomalyType;
  description: string;
  affectedRangeStart: number;
  affectedRangeEnd: number;
  evidences: Evidence[];
}

export interface DataPoint {
  timestamp: number;
  intensity: number;
  contrast: number;
  stability: number;
  sourceRow: string;
  anomaly?: AnomalyInfo;
}

export interface VersionEntry {
  id: string;
  version: string;
  timestamp: string;
  changeType: ChangeType;
  description: string;
  operatorName: string;
}

export interface DatasetSummary {
  paramVersion: string;
  anomalyCount: number;
  conclusion: string;
}

export interface DeviceParams {
  deviceName: string;
  nameplateLine: string;
  intensityMin: number;
  intensityMax: number;
  contrastMin: number;
  contrastMax: number;
  stabilityThreshold: number;
  vibrationLimit: number;
}

export interface MaterialParams {
  materialName: string;
  materialReportLine: string;
  surfaceRoughness: number;
  hardness: number;
  sampleId: string;
}

export interface SupplementItem {
  id: string;
  sourceName: string;
  sourceType: SourceType;
  content: string;
  lineNumber: number;
  anomalyId?: string;
  timestamp: string;
  operatorName: string;
}

export interface VersionSnapshot {
  id: string;
  version: string;
  timestamp: string;
  changeType: ChangeType;
  description: string;
  operatorName: string;
  dataPoints: DataPoint[];
  summary: DatasetSummary;
  deviceParams: DeviceParams;
  materialParams: MaterialParams;
  supplements: SupplementItem[];
}

export interface SpeckleDataset {
  id: string;
  snapshots: VersionSnapshot[];
}
