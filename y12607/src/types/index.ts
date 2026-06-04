export type RecordStatus = 'normal' | 'pending' | 'processed';

export type AnomalyType = 'none' | 'material_missing' | 'layer_occlusion' | 'incomplete_data' | 'old_format';

export interface ScoreRecord {
  id: string;
  patientName: string;
  patientId: string;
  scoreItem: string;
  score: number;
  fillTime: string;
  fillUnit: string;
  fillOperator: string;
  remark: string;
  status: RecordStatus;
  anomalyType: AnomalyType;
  anomalyReason: string;
  isOldFormat: boolean;
  hasSupplementary: boolean;
}

export interface LayerRecord {
  id: string;
  recordId: string;
  layerName: string;
  layerOrder: number;
  hasOcclusion: boolean;
  occlusionDesc: string;
  hasMaterial: boolean;
  materialType: 'screenshot' | 'video' | 'mark';
  uploadStatus: 'uploaded' | 'missing' | 'damaged';
}

export interface HitRecord {
  id: string;
  recordId: string;
  hitArea: string;
  hitTime: string;
  confidence: number;
  result: string;
}

export interface ProcessNote {
  id: string;
  recordId: string;
  operator: string;
  operateTime: string;
  action: string;
  suggestion: string;
}

export interface FilterConditions {
  anomalyType: AnomalyType | 'all';
  status: RecordStatus | 'all';
  dateFrom: string;
  dateTo: string;
  keyword: string;
}

export interface ImportData {
  scoreRecords: ScoreRecord[];
  layerRecords: LayerRecord[];
  hitRecords: HitRecord[];
  processNotes: ProcessNote[];
}
