export interface ReferenceSequence {
  id: string;
  name: string;
  sequence: string;
  length: number;
  gcContent: number;
}

export interface PrimerPair {
  id: string;
  name: string;
  batch?: string;
  forward: Primer;
  reverse: Primer;
  productSize: number;
  ampliconStart: number;
  ampliconEnd: number;
  status: 'valid' | 'warning' | 'invalid' | 'needs_review';
  notes?: string;
  importHash: string;
}

export interface Primer {
  id: string;
  sequence: string;
  direction: 'forward' | 'reverse';
  length: number;
  tm: number;
  gcContent: number;
  hasAmbiguity: boolean;
  ambiguityPositions?: number[];
  isReversed: boolean;
  bindingStart: number;
  bindingEnd: number;
}

export interface Mutation {
  id: string;
  sampleId: string;
  sampleName: string;
  position: number;
  refBase: string;
  altBase: string;
  quality?: number;
  alleleFrequency?: number;
}

export interface MutationImpact {
  mutationId: string;
  primerPairId: string;
  isThreePrimeMismatch: boolean;
  distanceFromThreePrime: number;
  mismatchLevel: 'critical' | 'high' | 'medium' | 'low';
  affectedPrimer: 'forward' | 'reverse' | 'both';
  recommendation: 'use' | 'caution' | 'replace';
}

export interface CoverageRegion {
  start: number;
  end: number;
  primerPairIds: string[];
  coverageDepth: number;
  isGap: boolean;
}

export interface SampleResult {
  sampleId: string;
  sampleName: string;
  mutationCount: number;
  criticalMismatches: MutationImpact[];
  recommendedPrimerPairs: string[];
  needsAlternativePrimers: boolean;
  notes: string;
}

export interface AnomalyRecord {
  id: string;
  type: 'reversed_primer' | 'ambiguity_base' | 'duplicate_name' | 'out_of_range_tm';
  severity: 'error' | 'warning' | 'info';
  primerPairId?: string;
  primerId?: string;
  message: string;
  suggestion: string;
}

export interface AnalysisConfig {
  minTm: number;
  maxTm: number;
  threePrimeCriticalBases: number;
  maxAllowedMismatches: number;
  minimumAmpliconSize: number;
  maximumAmpliconSize: number;
}

export interface AnalysisResult {
  id: string;
  createdAt: number;
  dataHash: string;
  reference: ReferenceSequence;
  primerPairs: PrimerPair[];
  mutations: Mutation[];
  coverage: CoverageRegion[];
  mutationImpacts: MutationImpact[];
  sampleResults: SampleResult[];
  anomalies: AnomalyRecord[];
  config: AnalysisConfig;
  summary: {
    totalPrimers: number;
    validPrimers: number;
    coveragePercent: number;
    gapCount: number;
    samplesNeedingAttention: number;
    anomalyCount: number;
  };
}

export interface BaseComplementMap {
  [key: string]: string;
}

export interface AlignmentResult {
  score: number;
  start: number;
  end: number;
  matches: number;
  mismatches: number;
  gaps: number;
  alignedQuery: string;
  alignedTarget: string;
}

export interface NearestNeighborParams {
  oligoConcentration: number;
  sodiumConcentration: number;
}

export interface FingerprintComponents {
  name: string;
  sequence: string;
  direction: 'forward' | 'reverse';
  batch?: string;
}
