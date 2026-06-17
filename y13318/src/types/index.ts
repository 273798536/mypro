export type Judge = 'OK' | 'NG';

export type ConfusionType = 'TP' | 'TN' | 'FP' | 'FN';

export type FilterKey = 'all' | 'duplicate' | 'misjudged' | 'skewed';

export type ExportKey = 'json' | 'report';

export interface Sample {
  id: string;
  materialType: string;
  imageUrl: string;
  groundTruth: Judge;
  prediction: Judge;
  confidence: number;
  timestamp: string;
  runId: string;
  version: string;
  dupGroup?: string;
}

export interface ChangedJudgment {
  sampleId: string;
  from: Judge;
  to: Judge;
}

export interface VersionNote {
  version: string;
  date: string;
  author: string;
  summary: string;
  changedJudgments: ChangedJudgment[];
}

export interface DuplicateGroup {
  id: string;
  count: number;
  crossVersion: boolean;
  sampleIds: string[];
}

export interface Metrics {
  total: number;
  ok: number;
  ng: number;
  tp: number;
  tn: number;
  fp: number;
  fn: number;
  accuracy: number;
  precision: number;
  recall: number;
  misjudgedCount: number;
  misjudgedRate: number;
  duplicateCount: number;
}

export interface SkewItem {
  sample: Sample;
  contribution: number;
  direction: '拉高误判' | '无影响';
  confusion: ConfusionType;
  dupCount: number;
}
