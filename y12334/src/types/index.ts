export interface TeamInfo {
  teamName: string;
  shift: string;
  supervisor: string;
  members: string[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  significanceLevel: number;
  status: 'draft' | 'analyzing' | 'completed' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  teamInfo: TeamInfo;
  hash?: string;
}

export interface DefectRecord {
  id: string;
  projectId: string;
  batchId: string;
  defectType: string;
  category: string;
  count: number;
  sampleSize?: number;
  materialSource: string;
  productionLine: string;
  shift: string;
  recordDate: Date;
  remarks?: string;
}

export interface Batch {
  id: string;
  projectId: string;
  batchNumber: string;
  sampleSize: number;
  productType: string;
  productionDate: Date;
  inspector: string;
}

export interface ChiSquareResult {
  id: string;
  projectId: string;
  chiSquareValue: number;
  degreesOfFreedom: number;
  pValue: number;
  criticalValue: number;
  conclusion: 'accept' | 'reject';
  conclusionText: string;
  contingencyTable: number[][];
  expectedTable: number[][];
  residuals: number[][];
  rowLabels: string[];
  colLabels: string[];
  analyzedAt: Date;
  teamSummary: string;
}

export interface Abnormality {
  id: string;
  projectId: string;
  type: 'insufficient_sample' | 'category_merged' | 'batch_mixed';
  severity: 'low' | 'medium' | 'high';
  triggerMaterial: string;
  blockedPosition: string;
  nextStep: string;
  status: 'pending' | 'resolved';
  detectedAt: Date;
  resolvedAt?: Date;
  details?: Record<string, unknown>;
}

export interface ReviewAdvice {
  projectId: string;
  overallAssessment: string;
  keyFindings: string[];
  recommendations: string[];
  followUpActions: string[];
  generatedAt: Date;
}

export interface ClassificationMatch {
  projectId: string;
  confidence: number;
  matchedFields: string[];
}

export interface ImportResult {
  success: boolean;
  records: DefectRecord[];
  errors: string[];
  warnings: string[];
}

export type SignificanceLevel = 0.01 | 0.05 | 0.10;

export interface DataHash {
  recordsHash: string;
  paramsHash: string;
  resultHash?: string;
}
