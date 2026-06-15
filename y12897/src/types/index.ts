export interface RiskNotice {
  id: string;
  title: string;
  noticeTime: string;
  location: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  handlingOpinion: string;
  source: string;
  latitude: number;
  longitude: number;
}

export interface BuoyData {
  id: string;
  buoyId: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  oilThickness: number;
  status: 'active' | 'offline' | 'maintenance';
  isOffline: boolean;
  lastOnline?: string;
}

export interface ShipTrack {
  id: string;
  shipId: string;
  shipName: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
}

export interface AquacultureLog {
  id: string;
  farmId: string;
  farmName: string;
  logDate: string;
  salinity?: number;
  waterQuality?: string;
  notes: string;
  latitude: number;
  longitude: number;
}

export interface SalinityData {
  id: string;
  stationId: string;
  stationName: string;
  timestamp: string;
  salinity: number;
  unit: 'ppt' | 'psu' | 'mg/L';
  source: string;
  latitude: number;
  longitude: number;
}

export interface AnomalyPoint {
  id: string;
  recordId: string;
  type: 'oil_spill' | 'buoy_offline' | 'salinity_anomaly' | 'track_deviation';
  timestamp: string;
  latitude: number;
  longitude: number;
  description: string;
  relatedNoticeId?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface DataGap {
  id: string;
  recordId: string;
  missingType: string;
  description: string;
  impact: string;
  suggestion: string;
  affectedRecords: string[];
}

export interface ReviewEntry {
  id: string;
  recordId: string;
  reviewedAt: string;
  reviewer: string;
  action: 'corrected' | 'confirmed' | 'escalated';
  notes: string;
  originalData: Record<string, unknown>;
  correctedData: Record<string, unknown>;
}

export interface ProcessingRecord {
  id: string;
  batchId: string;
  processedAt: string;
  sourceType: string;
  status: 'pending' | 'processing' | 'completed' | 'partial' | 'failed';
  rawData: Record<string, unknown>;
  cleanedData: Record<string, unknown>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  anomalies: AnomalyPoint[];
  dataGaps: DataGap[];
  reviewStatus: 'unreviewed' | 'in_review' | 'reviewed';
  reviewEntries: ReviewEntry[];
}

export interface OilSpillFrame {
  timestamp: string;
  particles: {
    x: number;
    y: number;
    z: number;
    size: number;
    opacity: number;
  }[];
  spreadRadius: number;
  centerX: number;
  centerY: number;
}

export interface TidalWindow {
  id: string;
  startTime: string;
  endTime: string;
  type: 'flood' | 'ebb' | 'slack';
  height: number;
  label: string;
}

export type SceneObjectType = 'buoy' | 'ship' | 'farm' | 'station' | 'anomaly' | 'spill_center';

export interface SceneSelection {
  type: SceneObjectType;
  id: string;
  data: Record<string, unknown>;
}
