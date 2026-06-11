export interface CadRecord {
  id: string;
  source: string;
  processStatus: 'pending' | 'processing' | 'completed' | 'error';
  x: number;
  y: number;
  timestamp: string;
  layer: string;
  rowNumber: number;
  originalFields: Record<string, unknown>;
}

export interface AnomalyPoint {
  id: string;
  recordId: string;
  type: 'boundary' | 'mutation' | 'incomplete' | 'gap';
  description: string;
  affectedRange: string[];
  sourceInfo: {
    source: string;
    processStatus: string;
    originalFields: Record<string, unknown>;
  };
}

export interface TimelineGap {
  id: string;
  startTime: string;
  endTime: string;
  duration: number;
  affectedRecordIds: string[];
  startRow: number;
  endRow: number;
}

export interface SavedView {
  id: string;
  name: string;
  filterConditions: FilterConditions;
  zoomLevel: number;
  center: { x: number; y: number };
  createdAt: string;
  thumbnail?: string;
}

export interface FieldMapping {
  cadField: string;
  standardField: string;
  locked: boolean;
}

export interface FilterConditions {
  timeRange: {
    start: string;
    end: string;
  } | null;
  processStatus: string[];
  sources: string[];
  layers: string[];
}

export interface ChartState {
  zoom: number;
  center: { x: number; y: number };
}

export interface ProcessStatusHistory {
  status: string;
  timestamp: string;
  operator: string;
}

export type AnomalyType = AnomalyPoint['type'];
