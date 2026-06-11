export type SampleStatus = 'success' | 'pending' | 'bad' | 'blocked';

export interface Sample {
  barcode: string;
  patientId: string;
  cellType: string;
  status: SampleStatus;
  operator: string;
  createdAt: Date;
  runCount: number;
  isBarcodeDuplicate: boolean;
  duplicateWith?: string;
  notes?: string;
}

export interface MigrationDataPoint {
  timePoint: number;
  areaMm2: number;
  migrationRate: number;
  areaQuality: 'good' | 'fair' | 'poor';
  pixelArea?: number;
  calibrationFactor?: number;
}

export type FailureCategory = 'image_quality' | 'scratch_irregular' | 'cell_density' | 'boundary_blur' | 'contamination';

export interface FailureReason {
  category: FailureCategory;
  description: string;
  severity: 'mild' | 'moderate' | 'severe';
}

export type QCStatus = 'pass' | 'warning' | 'fail';

export interface QCResult {
  qcId: string;
  cvValue: number;
  zPrimeFactor: number;
  cellViability: number;
  status: QCStatus;
  calculatedAt: Date;
}

export type AnalysisRunStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface AnalysisRun {
  runId: string;
  sampleBarcode: string;
  runNumber: number;
  reagentLotId?: string;
  status: AnalysisRunStatus;
  analyzedAt: Date;
  analyzedBy: string;
  migrationData: MigrationDataPoint[];
  failureReason?: FailureReason;
  qcResult?: QCResult;
}

export interface TimePoint {
  pointId: string;
  sampleBarcode: string;
  hour: number;
  isPresent: boolean;
  remark: string;
}

export interface CultureRecord {
  recordId: string;
  sampleBarcode: string;
  cultureStart: Date;
  temperature: number;
  co2Concentration: number;
  mediumType: string;
  operatorSign: string;
  remark: string;
}

export interface CheckItem {
  isComplete: boolean;
  issues: string[];
  remark: string;
}

export type ReviewSection = 'culture' | 'analysis' | 'qc' | 'other';

export interface ReviewComment {
  commentId: string;
  section: ReviewSection;
  content: string;
  suggestion: string;
}

export type ReviewRoundStatus = 'in_progress' | 'completed';

export interface ReviewRound {
  roundId: string;
  sampleBarcode: string;
  roundNumber: number;
  status: ReviewRoundStatus;
  reviewer: string;
  reviewedAt?: Date;
  cultureRecordCheck: CheckItem;
  timePointCheck: CheckItem;
  comments: ReviewComment[];
}

export interface ReagentLot {
  lotId: string;
  reagentName: string;
  manufacturer: string;
  expiryDate: Date;
  qcCertificate: string;
}

export interface CalculationFormula {
  name: string;
  formula: string;
  latex: string;
  unit: string;
  description: string;
  applicableRange: string;
  notApplicable: string[];
}

export interface DiffAnalysisResult {
  analysisId: string;
  roundNumber: number;
  conclusion: 'support' | 'not_support' | 'inconclusive';
  conclusionText: string;
  evidence: string[];
  limitations: string[];
  timestamp: Date;
  reagentLotId?: string;
  operator: string;
}

export interface ExportConfig {
  includeRawData: boolean;
  includeFormula: boolean;
  includeQC: boolean;
  includeHistory: boolean;
  format?: 'pdf' | 'csv' | 'excel';
}

export const FAILURE_CATEGORY_LABELS: Record<FailureCategory, string> = {
  image_quality: '图像质量差',
  scratch_irregular: '划痕不规则',
  cell_density: '细胞密度异常',
  boundary_blur: '边界模糊',
  contamination: '样本污染'
};

export const SAMPLE_STATUS_LABELS: Record<SampleStatus, string> = {
  success: '顺利通过',
  pending: '待确认',
  bad: '坏数据',
  blocked: '已拦截'
};

export const QC_STATUS_LABELS: Record<QCStatus, string> = {
  pass: '质控通过',
  warning: '质控警告',
  fail: '质控失败'
};

export const AREA_QUALITY_LABELS: Record<string, string> = {
  good: '良好',
  fair: '一般',
  poor: '较差'
};
