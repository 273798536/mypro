export type SampleStatus = 'pending' | 'reviewing' | 'approved' | 'rejected' | 'duplicate';

export type UserRole = 'teacher' | 'supervisor';

export type DuplicateType = 'barcode' | 'import' | 'supplement';

export type DuplicateResolution = 'merged' | 'removed' | 'pending';

export type ConclusionResult = 'pass' | 'fail' | 'pending';

export type ReviewRoundStatus = 'draft' | 'submitted' | 'finalized';

export interface Sample {
  id: string;
  barcode: string;
  samplingLocation: string;
  originalRowNumber: string;
  imageName: string;
  sourceNote: string;
  status: SampleStatus;
  batchNumber: string;
  createdAt: string;
  updatedAt: string;
}

export interface CultureRecord {
  id: string;
  sampleId: string;
  timePoint: string;
  content: string;
  operator: string;
  recordDate: string;
  isMissing: boolean;
  linkedConclusionId: string | null;
}

export interface ReviewRound {
  id: string;
  sampleId: string;
  roundNumber: number;
  reviewer: string;
  reviewDate: string;
  status: ReviewRoundStatus;
}

export interface ReviewOpinion {
  id: string;
  reviewRoundId: string;
  content: string;
  missingTimePoints: string[];
  createdAt: string;
}

export interface FinalConclusion {
  id: string;
  reviewRoundId: string;
  result: ConclusionResult;
  linkedCultureRecordId: string | null;
  createdAt: string;
}

export interface DuplicateLog {
  id: string;
  sampleBarcode: string;
  duplicateType: DuplicateType;
  detectedAt: string;
  resolution: DuplicateResolution;
  sampleIds: string[];
}

export interface ActiveFilters {
  batchNumber?: string;
  startDate?: string;
  endDate?: string;
  samplingLocation?: string;
  status?: SampleStatus;
}

export interface CurrentUser {
  role: UserRole;
  name: string;
}

export interface AppState {
  samples: Sample[];
  cultureRecords: CultureRecord[];
  reviewRounds: ReviewRound[];
  reviewOpinions: ReviewOpinion[];
  finalConclusions: FinalConclusion[];
  duplicateLogs: DuplicateLog[];
  activeFilters: ActiveFilters;
  currentUser: CurrentUser;
  hasVisitedBefore: boolean;
  highlightedElementId: string | null;
  currentReviewBatch: string | null;
}

export interface ChartData {
  passRate: number;
  locationData: { name: string; value: number }[];
  anomalyData: { name: string; value: number; color: string }[];
}

export interface ExportData {
  samples: Sample[];
  cultureRecords: CultureRecord[];
  reviewOpinions: ReviewOpinion[];
  finalConclusions: FinalConclusion[];
}
