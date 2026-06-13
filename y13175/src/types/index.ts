export interface SensorLog {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  pointCount: number;
  status: 'incomplete' | 'complete' | 'pending_review';
  batchIds: string[];
}

export interface LogBatch {
  id: string;
  logId: string;
  fileName: string;
  importTime: string;
  importedBy: string;
  dataPointCount: number;
  dataStartTime: string;
  dataEndTime: string;
}

export interface SensorPoint {
  id: string;
  logId: string;
  name: string;
  x: number;
  y: number;
  z: number;
  type: 'laser' | 'detector' | 'reference';
}

export interface ParamVersion {
  id: string;
  versionName: string;
  description: string;
  parameters: Record<string, number | string | boolean>;
  createdAt: string;
  createdBy: string;
  isCurrent: boolean;
}

export interface SamplingGap {
  id: string;
  startTime: string;
  endTime: string;
  duration: number;
  severity: 'low' | 'medium' | 'high';
  sensorIds: string[];
}

export interface CalculationResult {
  id: string;
  logId: string;
  paramVersionId: string;
  calculatedAt: string;
  status: 'calculating' | 'done' | 'error';
  judgment: 'pass' | 'fail' | 'pending';
  confidence: number;
  resultData: {
    averageIntensity: number;
    contrastRatio: number;
    speckleSize: number;
    stability: number;
  };
  samplingGaps: SamplingGap[];
  needsManualReview: boolean;
  reviewReason?: string;
}

export interface ManualJudgment {
  id: string;
  resultId: string;
  judgment: 'pass' | 'fail';
  reason: string;
  nextStep: string;
  judgedAt: string;
  judgedBy: string;
}

export interface Report {
  id: string;
  resultId: string;
  category: 'processed' | 'pending_material' | 'manual_override';
  title: string;
  content: string;
  generatedAt: string;
  dataSources: string[];
}

export interface TimeSeriesPoint {
  timestamp: string;
  values: Record<string, number>;
}

export type ReportCategory = 'processed' | 'pending_material' | 'manual_override';
