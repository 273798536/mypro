import type { ConclusionKey, EventTypeKey, PollutionKey, DecisionCategoryKey } from "./constants";

export interface ModelVersion {
  id: string;
  releasedAt: string;
  threshold: number;
  description: string;
}

export interface GrayConfig {
  id: string;
  name: string;
  ratio: number;
  windowSize: number;
  versionId: string;
  createdBy: string;
  createdAt: string;
}

export interface AlgoScoreSnapshot {
  versionId: string;
  score: number;
  rawScore?: number;
  smoothedScore?: number;
}

export interface Correction {
  id: string;
  sampleId: string;
  operator: string;
  timestamp: string;
  oldConclusion: ConclusionKey;
  newConclusion: ConclusionKey;
  reason: string;
}

export interface Sample {
  id: string;
  featureVector: number[];
  algoScores: AlgoScoreSnapshot[];
  isBoundary: boolean;
  coveredByMean: boolean;
  pollutionStatus: PollutionKey;
  pollutionNote?: string;
  conclusion: ConclusionKey;
  conclusionReason: string;
  grayConfigId: string;
  versionId: string;
  sampledAt: string;
  source: string;
  correctionHistory: Correction[];
}

export interface TimelineEvent {
  id: string;
  type: EventTypeKey;
  timestamp: string;
  operator?: string;
  sampleId?: string;
  versionId?: string;
  grayConfigId?: string;
  payload: Record<string, unknown>;
  displayLabel: string;
}

export interface DecisionItem {
  id: string;
  sampleId: string;
  category: DecisionCategoryKey;
  remark: string;
  createdAt: string;
  operator: string;
}

export interface DashboardFilters {
  versionId: string | null;
  grayConfigId: string | null;
  pollutionStatuses: PollutionKey[];
  conclusionStatuses: ConclusionKey[];
  isBoundaryOnly: boolean;
  isCoveredByMeanOnly: boolean;
  dateRange: [string, string] | null;
  keyword: string;
}

export interface GrayBreakdownSegment {
  key: "sample" | "threshold" | "manual";
  label: string;
  contribution: number;
  description: string;
  details: { label: string; value: string | number; note?: string }[];
  miniChart: number[];
}

export type GrayBreakdown = GrayBreakdownSegment[];
