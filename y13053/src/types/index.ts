export type HeightUnit = 'm' | 'F' | '层';

export type RecordStatus = 'normal' | 'supplement' | 'anomaly';

export interface WindProfilePoint {
  id: string;
  height: number;
  heightUnit: HeightUnit;
  windSpeed: number;
  windDirection: number;
  station: string;
  timestamp: string;
  isAnomaly: boolean;
  linkedRecordId?: string;
}

export interface SourceMaterial {
  type: 'model' | 'csv' | 'field-photo';
  name: string;
  path: string;
}

export interface ReviewRecord {
  id: string;
  status: RecordStatus;
  title: string;
  reviewer: string;
  reviewedAt: string;
  comment: string;
  sourceMaterial: SourceMaterial;
  linkedPointIds: string[];
}

export type StatusFilter = 'all' | 'anomaly' | 'normal';

export interface AppFilters {
  station: string;
  dateFrom: string;
  dateTo: string;
  statusFilter: StatusFilter;
}
