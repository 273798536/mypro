export type SnapshotStatus = 'pending' | 'reviewing' | 'approved' | 'rejected';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface Snapshot {
  id: string;
  code: string;
  deviceName: string;
  thumbnail: string;
  imagePath: string;
  status: SnapshotStatus;
  riskLevel: RiskLevel;
  createdAt: string;
  updatedAt: string;
  lastOperator: string;
}

export interface SectionData {
  cutLine: { x1: number; y1: number; x2: number; y2: number };
  measurements: Array<{ label: string; value: number; unit: string }>;
}

export interface Coordinates {
  x: number;
  y: number;
  z: number;
  unit: string;
}

export interface Dimensions {
  width: number;
  height: number;
  depth: number;
  unit: string;
}

export interface ConversionItem {
  fromUnit: string;
  toUnit: string;
  value: number;
  converted: number;
  formula: string;
}

export interface ProcessingRecord {
  id: string;
  snapshotId: string;
  sectionData: SectionData | null;
  coordinates: Coordinates | null;
  dimensions: Dimensions | null;
  conversions: ConversionItem[];
  riskNotes: string;
  conclusion: string;
  operator: string;
  createdAt: string;
}

export interface FieldChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface HistoryRecord {
  id: string;
  snapshotId: string;
  version: number;
  processingRecordId: string;
  operator: string;
  changeReason: string;
  changes: FieldChange[];
  createdAt: string;
}

export interface ReviewSubmission {
  snapshotId: string;
  processingRecord: ProcessingRecord;
  riskApproved: boolean;
  coordinateApproved: boolean;
  conversionApproved: boolean;
  reviewComment: string;
  changeReason: string;
  operator: string;
}

export interface HistorySummary {
  version: number;
  operator: string;
  reason: string;
  date: string;
}

export interface ReportData {
  snapshot: Snapshot;
  latestRecord: ProcessingRecord;
  plainExplanation: string;
  historySummary: HistorySummary[];
}

export interface TraceLink {
  id: string;
  type: 'anomaly' | 'snapshot' | 'record' | 'opinion';
  label: string;
  description: string;
  time: string;
}

export interface TraceResult {
  anomalyId: string;
  chain: TraceLink[];
}
