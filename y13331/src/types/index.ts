export type VersionStatus = 'active' | 'withdrawn' | 'abnormal';

export interface CalcConfig {
  threshold: number;
  samplingRule: string;
  evaluationFormula: string;
  attributeWeights: Record<string, number>;
}

export interface Metric {
  id: string;
  name: string;
  value: number;
  delta: number;
  isAbnormal: boolean;
}

export interface Contribution {
  score: number;
  impactReason: string;
}

export interface Sample {
  id: string;
  productName: string;
  attributes: Record<string, string>;
  apiResponse: Record<string, unknown>;
  isLeak: boolean;
  contribution: Contribution;
}

export interface LeakRecord {
  id: string;
  sampleId: string;
  markedBy: string;
  markedAt: string;
  reason: string;
}

export interface Version {
  id: string;
  versionNumber: string;
  description: string;
  createdAt: string;
  status: VersionStatus;
  withdrawReason?: string;
  calcConfig: CalcConfig;
  metrics: Metric[];
  samples: Sample[];
  leakRecords: LeakRecord[];
}
