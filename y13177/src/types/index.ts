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

export interface SpeckleDataset {
  id: string;
  deviceName: string;
  materialName: string;
  dataPoints: DataPoint[];
  versions: VersionEntry[];
  summary: DatasetSummary;
}
