export type DataSourceType = 'color_rule' | 'score_table' | 'basemap_coords';

export interface DataSource {
  id: string;
  name: string;
  type: DataSourceType;
  uploadTime: Date;
  fileName: string;
}

export type AnomalyType = 
  | 'missing_unit' 
  | 'color_mismatch' 
  | 'coordinate_outlier' 
  | 'score_abnormal' 
  | 'layer_occlusion';

export type Severity = 'low' | 'medium' | 'high';

export interface Anomaly {
  id: string;
  recordId: string;
  type: AnomalyType;
  severity: Severity;
  description: string;
  humanReadableReason: string;
  resolved: boolean;
  sourceMaterial: string;
}

export interface ProcessOpinion {
  id: string;
  anomalyId: string;
  content: string;
  createTime: Date;
  author: string;
}

export interface CoastlineRecord {
  id: string;
  sourceId: string;
  segmentName: string;
  colorRule: string;
  score: number;
  coordinates: [number, number][];
  unit?: string;
  remark?: string;
  hasAnomaly: boolean;
  anomalies: Anomaly[];
}

export type CanvasOperation = 'create' | 'modify' | 'undo' | 'redo';

export interface CanvasState {
  id: string;
  recordId: string;
  version: number;
  snapshot: string;
  timestamp: Date;
  operation: CanvasOperation;
  description: string;
}

export interface HistoryState {
  past: CanvasState[];
  present: CanvasState | null;
  future: CanvasState[];
}

export interface ReportData {
  generatedAt: Date;
  totalRecords: number;
  anomalyCount: number;
  resolvedCount: number;
  layerOcclusionDetails: LayerOcclusionDetail[];
  materialMissingReasons: MaterialMissingReason[];
  anomalySummary: AnomalySummary[];
}

export interface LayerOcclusionDetail {
  id: string;
  layerName: string;
  occludedBy: string;
  sourceMaterial: string;
  description: string;
}

export interface MaterialMissingReason {
  id: string;
  fieldName: string;
  humanReadable: string;
  sourceMaterial: string;
}

export interface AnomalySummary {
  type: AnomalyType;
  count: number;
  severity: Severity;
}
