export interface DrumScore {
  id: string;
  name: string;
  totalMeasures: number;
  beatsPerMeasure: number;
  metadata: Record<string, unknown>;
  createdAt: number;
}

export interface Measure {
  id: string;
  scoreId: string;
  measureNumber: number;
  beatPattern: number[];
}

export interface SpeedLadder {
  id: string;
  name: string;
  startBpm: number;
  endBpm: number;
  interval: number;
  customTiers: number[] | null;
  jumpStrategy: 'stepwise' | 'custom';
}

export interface SpeedTier {
  id: string;
  ladderId: string;
  bpm: number;
  order: number;
  status: 'pending' | 'pass' | 'fail' | 'review';
}

export interface PracticeSample {
  id: string;
  scoreId: string;
  ladderId: string;
  studentName: string;
  date: number;
}

export interface PracticeSession {
  id: string;
  sampleId: string;
  version: number;
  createdAt: number;
  snapshotHash: string;
}

export interface TierResult {
  id: string;
  sessionId: string;
  bpm: number;
  passStatus: 'pass' | 'fail' | 'pending';
  duration: number;
}

export interface FailureMark {
  id: string;
  tierResultId: string;
  measureNumber: number;
  failureType: 'rhythm' | 'dynamics' | 'miss';
  correctedAt: number | null;
}

export interface MissCorrection {
  id: string;
  sessionId: string;
  measureNumber: number;
  offsetBeats: number;
  correctionType: string;
  createdAt: number;
}

export interface ImpactEntry {
  id: string;
  correctionId: string;
  targetType: 'tier_result' | 'practice_suggestion' | 'ladder_status';
  targetId: string;
  beforeValue: string;
  afterValue: string;
}

export interface PracticeSuggestion {
  id: string;
  sampleId: string;
  recommendedBpm: number;
  focusMeasures: number[];
  reason: string;
  updatedAt: number;
}

export interface EvaluationInput {
  failures: FailureMark[];
  ladder: SpeedLadder;
  corrections: MissCorrection[];
  tierResults: TierResult[];
}

export interface EvaluationResult {
  tierStatuses: Record<string, 'pass' | 'fail' | 'review'>;
  suggestions: PracticeSuggestion[];
  impactMap: Record<string, ImpactEntry[]>;
  snapshotHash: string;
}

export interface ChangeLogEntry {
  id: string;
  correctionId: string;
  field: string;
  before: string;
  after: string;
  timestamp: number;
}

export type FailureType = 'rhythm' | 'dynamics' | 'miss';
export type PassStatus = 'pass' | 'fail' | 'pending';
export type TierStatus = 'pass' | 'fail' | 'review' | 'pending';
export type JumpStrategy = 'stepwise' | 'custom';
export type ImpactTargetType = 'tier_result' | 'practice_suggestion' | 'ladder_status';

export const FAILURE_TYPE_LABELS: Record<FailureType, string> = {
  rhythm: '节奏错',
  dynamics: '力度错',
  miss: '漏拍',
};

export const PASS_STATUS_LABELS: Record<PassStatus, string> = {
  pass: '通过',
  fail: '失败',
  pending: '待练习',
};

export const TIER_STATUS_LABELS: Record<TierStatus, string> = {
  pass: '通过',
  fail: '失败',
  review: '需复查',
  pending: '待练习',
};
