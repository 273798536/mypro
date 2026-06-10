export type Barcode = string;

export type UserRole = 'technician' | 'quality_control' | 'admin';

export type NodeType = 'import' | 'ai_analysis' | 'manual_correction' | 'review' | 'conclusion';

export type RelationType = 'correction' | 'reimport' | 'supplement' | 'merge';

export type MergeStrategy = 'keep_latest' | 'keep_original' | 'manual' | null;

export type SampleStatus = 'pending' | 'analyzing' | 'reviewing' | 'confirmed' | 'conflict';

export interface User {
  id: string;
  name: string;
  employeeId: string;
  role: UserRole;
  avatar?: string;
}

export interface SourceOrigin {
  id: string;
  originalRowNumber: number;
  originalFileName: string;
  sourceRemark: string;
  importBatchId: string;
  importTimestamp: number;
  importOperatorId: string;
}

export interface GroupIndicators {
  groupId: string;
  batchId: string;
  testDate: string;
  testType: string;
  operator: string;
  biosafetyCabinetId: string;
  [key: string]: any;
}

export interface SequencingResult {
  geneName: string;
  variant: string;
  alleleFrequency: number;
  qualityScore: number;
  coverage: number;
  interpretation: string;
  [key: string]: any;
}

export interface ManualCorrection {
  correctionId: string;
  fieldName: string;
  oldValue: any;
  newValue: any;
  reason: string;
  correctedBy: string;
  correctedAt: number;
  reviewCommentId: string | null;
}

export interface AiAnalysisResult {
  analysisId: string;
  modelVersion: string;
  anomalyScore: number;
  suggestions: Array<{
    field: string;
    suggestedValue: any;
    confidence: number;
    reasoning: string;
  }>;
  executedAt: number;
}

export interface SampleVersion {
  versionId: string;
  versionNumber: number;
  parentVersionId: string | null;
  barcode: Barcode;
  sequencingResult: SequencingResult;
  manualCorrections: ManualCorrection[];
  groupIndicators: GroupIndicators;
  createdAt: number;
  createdBy: string;
  changeReason: string;
  isDuplicate: boolean;
  sourceOrigin: SourceOrigin;
  aiAnalysis?: AiAnalysisResult;
  status: SampleStatus;
}

export interface LineageRelation {
  fromVersionId: string;
  toVersionId: string;
  relationType: RelationType;
  changedFields: string[];
}

export interface ChangedField {
  field: string;
  oldValue: any;
  newValue: any;
  isAiSuggested: boolean;
  confidence: number;
}

export interface DiffResult {
  barcode: Barcode;
  oldVersion: SampleVersion;
  newVersion: SampleVersion;
  changedFields: ChangedField[];
  aiAnalysis: AiAnalysisResult | null;
  timestamp: number;
}

export interface ReviewComment {
  commentId: string;
  barcode: Barcode;
  versionId: string;
  content: string;
  reviewedBy: string;
  reviewedAt: number;
  finalConclusionId: string | null;
}

export interface FinalConclusion {
  conclusionId: string;
  barcode: Barcode;
  finalResult: string;
  conclusion: string;
  confirmedBy: string;
  confirmedAt: number;
  reviewCommentIds: string[];
  traceLinkIds: string[];
  isFinal: boolean;
}

export interface TraceNode {
  nodeId: string;
  nodeType: NodeType;
  timestamp: number;
  operatorId: string;
  dataSnapshot: Record<string, any>;
  sourceOriginId: string;
  previousNodeId: string | null;
  nextNodeId: string | null;
  conclusionId?: string;
}

export interface DedupRecord {
  versionId: string;
  sourceOrigin: SourceOrigin;
  importTimestamp: number;
  similarity: number;
}

export interface DedupResult {
  dedupId: string;
  barcode: Barcode;
  duplicateCount: number;
  duplicateRecords: DedupRecord[];
  isConfirmedDuplicate: boolean;
  mergeStrategy: MergeStrategy;
  resolvedAt?: number;
  resolvedBy?: string;
}

export interface AuditLog {
  logId: string;
  operatorId: string;
  operatorName: string;
  action: string;
  targetType: string;
  targetId: string;
  timestamp: number;
  details: Record<string, any>;
  ipAddress?: string;
}

export interface ImportPreviewItem {
  rowNumber: number;
  barcode: Barcode;
  data: Record<string, any>;
  isDuplicate: boolean;
  duplicateBarcode?: Barcode;
  conflictFields?: string[];
}

export interface ImportBatch {
  batchId: string;
  fileName: string;
  importTime: number;
  operatorId: string;
  totalRecords: number;
  duplicateCount: number;
  previewItems: ImportPreviewItem[];
  status: 'previewing' | 'importing' | 'completed' | 'cancelled';
}

export interface StatisticsOverview {
  todayImports: number;
  pendingDiffs: number;
  duplicateWarnings: number;
  aiAnalysisProgress: number;
  totalSamples: number;
  confirmedConclusions: number;
  pendingReviews: number;
  thisMonthAudits: number;
}

export interface LineageGraphData {
  nodes: Array<{
    id: string;
    type: NodeType | 'version';
    label: string;
    data: SampleVersion | TraceNode;
    status: SampleStatus;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    relationType: RelationType;
    label?: string;
  }>;
}

export interface TracePathResult {
  conclusionId: string;
  barcode: Barcode;
  nodes: TraceNode[];
  totalSteps: number;
  timeSpan: {
    start: number;
    end: number;
  };
  operators: string[];
}
