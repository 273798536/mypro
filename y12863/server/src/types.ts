export type DataStatus = 'available' | 'pending' | 'recollect';

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface AnchorageRecord {
  id: string;
  recordNo: string;
  shipName: string;
  anchorageName: string;
  typhoonName: string;
  reportDate: string;
  reportedLat: number;
  reportedLng: number;
  actualLat: number;
  actualLng: number;
  driftDistance: number | null;
  driftCalculationNote: string | null;
  status: DataStatus;
  reviewStatus: ReviewStatus;
  photos: PhotoRef[];
  sourceFile: string;
  sourceRow: number;
  importedAt: string;
  importBatchId: string;
}

export interface PhotoRef {
  id: string;
  fileName: string;
  filePath: string;
  uploadTime: string;
  remark: string;
}

export interface ReviewHistory {
  id: string;
  recordId: string;
  fieldName: string;
  oldValue: string | number | null;
  newValue: string | number | null;
  reviewer: string;
  remark: string;
  reviewedAt: string;
  fromStatus: ReviewStatus;
  toStatus: ReviewStatus;
}

export interface ImportBatch {
  id: string;
  fileName: string;
  importedAt: string;
  recordCount: number;
  duplicateCount: number;
  operator: string;
}

export interface DriftCalculationResult {
  distance: number;
  unit: string;
  formula: string;
  applicable: boolean;
  failReason: string | null;
  scope: string;
  input: {
    lat1: number;
    lng1: number;
    lat2: number;
    lng2: number;
  };
}

export interface MonthlyReport {
  month: string;
  generatedAt: string;
  totalRecords: number;
  availableCount: number;
  pendingCount: number;
  recollectCount: number;
  approvedCount: number;
  pendingReviewCount: number;
  avgDriftDistance: number | null;
  records: AnchorageRecord[];
}
