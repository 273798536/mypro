export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface DamGeometry {
  width: number;
  height: number;
  depth: number;
  upstreamSlope: number;
  downstreamSlope: number;
}

export interface DamModel {
  id: string;
  name: string;
  importTime: Date;
  geometry: DamGeometry;
  sourceFile: FileInfo;
}

export interface CrackPoint {
  id: string;
  position: Vector3;
  length: number;
  width: number;
  depth: number;
  description: string;
  detectionTime: Date;
  isDuplicate: boolean;
  duplicateOf?: string;
}

export interface Sensor {
  id: string;
  name: string;
  position: Vector3;
  type: 'pressure' | 'water_level' | 'flow';
  status: 'online' | 'offline' | 'warning';
  lastUpdate: Date;
}

export interface SeepageData {
  id: string;
  sensorId: string;
  timestamp: Date;
  value: number;
  unit: string;
}

export interface InspectionNote {
  id: string;
  author: string;
  timestamp: Date;
  content: string;
  relatedCrackIds: string[];
  images?: string[];
}

export type AnomalyType = 'duplicate_crack' | 'sensor_offline' | 'water_level_spike';
export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';
export type RiskLevel = 'safe' | 'warning' | 'danger' | 'critical';

export interface AnomalyRecord {
  id: string;
  type: AnomalyType;
  severity: SeverityLevel;
  timestamp: Date;
  description: string;
  relatedEntityId: string;
  pathHistory?: PathNode[];
}

export interface PathNode {
  step: number;
  action: string;
  timestamp: Date;
  result: 'success' | 'failure' | 'warning';
  details: string;
}

export interface AnalysisReport {
  id: string;
  generatedAt: Date;
  author: string;
  summary: string;
  anomalies: AnomalyRecord[];
  riskAssessment: RiskLevel;
  screenshots: string[];
  rawMaterials: FileInfo[];
}

export interface FileInfo {
  id: string;
  name: string;
  type: 'model' | 'data' | 'note';
  size: number;
  uploadTime: Date;
  hash: string;
}

export interface HeatMapPoint {
  position: Vector3;
  riskValue: number;
  label: string;
}
