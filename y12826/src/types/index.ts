export type SampleStatus = 'normal' | 'warning' | 'contaminated' | 'manually_confirmed' | 'pending';

export type ContaminationType = 'mycoplasma' | 'cross_sample' | 'reagent' | 'unknown';

export type BatchStatus = 'completed' | 'running' | 'needs_review';

export type VersionReason = 'initial' | 're_run' | 'qc_param_change' | 'supplementary';

export interface QualityMetrics {
  proteinConcentration: number;
  purity: number;
  integrity: number;
  backgroundNoise: number;
  particleCount: number;
}

export interface ContaminationResult {
  detected: boolean;
  type: ContaminationType;
  confidence: number;
  suspectedSource: string;
}

export interface SampleVersion {
  version: number;
  timestamp: string;
  reason: VersionReason;
  qualityMetrics: QualityMetrics;
  contamination: ContaminationResult;
  status: SampleStatus;
}

export interface Sample {
  id: string;
  batchId: string;
  name: string;
  sourceMaterial: string;
  collectedAt: string;
  micrographUrl: string;
  micrographModifiedUrl?: string;
  species: string;
  speciesCanonical: string;
  hasSpeciesSynonymIssue: boolean;
  qualityMetrics: QualityMetrics;
  contamination: ContaminationResult;
  status: SampleStatus;
  manualNote?: string;
  versions: SampleVersion[];
  currentVersion: number;
}

export interface QCThresholds {
  minProteinConcentration: number;
  minPurity: number;
  minIntegrity: number;
  maxBackgroundNoise: number;
  contaminationConfidenceThreshold: number;
}

export interface AuditBatch {
  id: string;
  name: string;
  createdAt: string;
  sampleCount: number;
  abnormalCount: number;
  contaminationRate: number;
  status: BatchStatus;
  qcThresholds: QCThresholds;
}

export interface SpeciesSynonym {
  canonical: string;
  synonyms: string[];
}
