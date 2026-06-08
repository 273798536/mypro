export interface DataPoint {
  id: string;
  value: number;
  unit: string;
  isOutlier: boolean;
  remark?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  verificationReason?: string;
}

export interface SectionImage {
  id: string;
  taskId: string;
  version: string;
  imageUrl: string;
  conclusion: string;
  createdAt: string;
  measurementData?: number[];
  operator?: string;
}

export interface HistoryRecord {
  id: string;
  taskId: string;
  operator: string;
  action: string;
  reason: string;
  timestamp: string;
  beforeData?: any;
  afterData?: any;
}

export type TaskStatus = 'pending' | 'checking' | 'reviewing' | 'completed';

export interface Task {
  id: string;
  name: string;
  status: TaskStatus;
  robotModel: string;
  nominalValue: number;
  tolerance: number;
  createdAt: string;
  updatedAt: string;
  dataPoints: DataPoint[];
  sectionImages: SectionImage[];
  history: HistoryRecord[];
  batchId?: string;
  createdBy?: string;
}

export interface CalculatorInput {
  actualValue: number;
  nominalValue: number;
  tolerance: number;
}

export interface ValidationResult {
  isValid: boolean;
  value: number;
  deviation: number;
  lowerBound: number;
  upperBound: number;
  formula: string;
  unit: string;
  scope: string;
  failureReason?: string;
}

export interface OutlierStatistics {
  mean: number;
  std: number;
  min: number;
  max: number;
  median: number;
  outlierIndices: number[];
}

export interface SectionRecord {
  id: string;
  batchId: string;
  serialNumber: string;
  sectionName: string;
  deviceCoords: {
    x: number;
    y: number;
    z: number;
  };
  conclusion: string;
  status: 'draft' | 'verified' | 'rejected' | 'amended';
  screenshots: string[];
  pointCloudDataHash: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface AppState {
  records: SectionRecord[];
  history: HistoryRecord[];
  currentUser: {
    id: string;
    name: string;
  };
}

export interface VerificationAudit {
  id: string;
  dataPointId: string;
  taskId: string;
  operator: string;
  action: 'mark_outlier' | 'unmark_outlier' | 'verify_pass' | 'verify_reject';
  reason: string;
  beforeValue: any;
  afterValue: any;
  timestamp: string;
}
