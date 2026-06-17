export type SourceType = 'old_correction' | 'normal_record' | 'verbal_note';

export type CitationStatus = 'complete' | 'missing' | 'partial';

export type WorkflowStatus = 'pending' | 'approved' | 'need_material' | 'recheck';

export interface CorrectionRecord {
  id: string;
  sourceType: SourceType;
  field: string;
  oldValue: string;
  newValue: string;
  operator: string;
  remark: string;
  timestamp: string;
}

export interface CitationItem {
  id: string;
  type: 'standard_doc' | 'reference_image' | 'spec_sheet';
  name: string;
  url: string;
  isValid: boolean;
}

export interface QualitySample {
  sampleId: string;
  batchId: string;
  batchName: string;
  version: string;
  imageUrl: string;
  originalJudgment: string;
  revisedJudgment: string;
  defectType: string;
  confidence: number;
  sourceType: SourceType;
  citationStatus: CitationStatus;
  workflowStatus: WorkflowStatus;
  corrections: CorrectionRecord[];
  citations: CitationItem[];
  createdAt: string;
  updatedAt: string;
  operatorRemark?: string;
}

export interface VersionConfig {
  version: string;
  name: string;
  releaseDate: string;
  thresholds: Record<string, number>;
  description: string;
}

export interface TrendItem {
  date: string;
  revised: number;
  passRate: number;
}

export interface DefectDistributionItem {
  type: string;
  count: number;
}

export interface KPIData {
  totalSamples: number;
  revisedCount: number;
  passRate: number;
  citationMissing: number;
  pendingCount: number;
  trend: TrendItem[];
  defectDistribution: DefectDistributionItem[];
}

export interface CitationCheckResult {
  sampleId: string;
  riskLevel: 'high' | 'medium' | 'low';
  missingTypes: Array<'standard_doc' | 'reference_image' | 'spec_sheet'>;
  reason: string;
  suggestedNextStep: string;
  checkedAt: string;
}
