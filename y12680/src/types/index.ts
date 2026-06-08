export type ReviewStatus = 'usable' | 'pending' | 'unusable';

export type AnomalyType = 'camera_lost' | 'data_conflict' | 'format_error';

export interface CameraAngle {
  azimuth: number;
  elevation: number;
  distance: number;
}

export interface PocketCoordinates {
  x: number;
  y: number;
  z: number;
}

export interface PocketRecord {
  id: string;
  originalRowNumber: number;
  sourceFile: string;
  proteinName: string;
  pocketCoordinates: PocketCoordinates;
  affinity: number;
  cameraAngle?: CameraAngle;
  anomalyType?: AnomalyType;
  anomalyNote?: string;
  reviewStatus: ReviewStatus;
  reviewNote?: string;
  processingOpinion?: string;
  imageName?: string;
  sourceNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ImportHistory {
  id: string;
  fileName: string;
  importTime: string;
  recordCount: number;
  duplicateCount: number;
}

export interface ViewState {
  cameraAngle?: CameraAngle;
  filters: {
    status?: ReviewStatus;
    anomalyType?: AnomalyType | 'none';
    proteinName?: string;
  };
  sortBy?: keyof PocketRecord;
  sortOrder?: 'asc' | 'desc';
}

export interface ParsedRow {
  originalRowNumber: number;
  data: Record<string, string | number>;
}
