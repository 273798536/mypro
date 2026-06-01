export interface Supplier {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  registeredCapital: string;
  establishmentDate: string;
  businessScope: string;
  qualificationLevel: string;
  riskNotes: string;
  quotation?: number;
  quotationStatus: 'complete' | 'missing' | 'partial';
  sourceReference: string;
  createdAt: string;
  updatedAt: string;
}

export interface Criterion {
  id: string;
  name: string;
  description: string;
  parentId?: string;
  children?: Criterion[];
  weight?: number;
  originalWeight?: number;
  isManuallyModified?: boolean;
  modifiedBy?: string;
  modifiedAt?: string;
  modificationReason?: string;
}

export interface ComparisonMatrix {
  id: string;
  name: string;
  criterionId?: string;
  criteriaIds: string[];
  matrix: number[][];
  consistencyRatio: number;
  isConsistent: boolean;
  weights: number[];
  createdAt: string;
  updatedAt: string;
}

export interface Score {
  supplierId: string;
  criterionId: string;
  value: number;
  note?: string;
  sourceReference?: string;
}

export interface WeightModification {
  id: string;
  criterionId: string;
  criterionName: string;
  originalWeight: number;
  newWeight: number;
  modifiedBy: string;
  modifiedAt: string;
  reason: string;
  impactOnRanking: {
    supplierId: string;
    supplierName: string;
    originalRank: number;
    newRank: number;
    scoreChange: number;
  }[];
}

export interface RankingResult {
  supplierId: string;
  supplierName: string;
  totalScore: number;
  rank: number;
  scoresByCriterion: {
    criterionId: string;
    criterionName: string;
    score: number;
    weight: number;
    weightedScore: number;
  }[];
  quotation?: number;
  riskNotes: string;
}

export interface VersionHistory {
  id: string;
  version: number;
  timestamp: string;
  modifiedBy: string;
  changes: string[];
  rankings: RankingResult[];
  matrices: ComparisonMatrix[];
}

export interface FilterCriteria {
  minScore?: number;
  maxScore?: number;
  quotationRange?: { min?: number; max?: number };
  riskLevel?: 'all' | 'low' | 'medium' | 'high';
  selectedSuppliers?: string[];
}

export interface ReportData {
  title: string;
  generatedAt: string;
  generatedBy: string;
  rankings: RankingResult[];
  matrices: ComparisonMatrix[];
  weightModifications: WeightModification[];
  versionHistory: VersionHistory[];
  filterCriteria: FilterCriteria;
  rankingExplanation: string;
}
