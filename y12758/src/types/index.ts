export interface ImpurityRecord {
  id: string;
  name: string;
  measuredValue: number;
  limitValue: number;
  standard: string;
}

export interface ReactionConditions {
  temperature?: number;
  ph?: number;
  time?: number;
  [key: string]: any;
}

export interface ExperimentBatch {
  batchId: string;
  sampleName: string;
  recordDate: string;
  reactionConditions: ReactionConditions;
  impurities: ImpurityRecord[];
  sourceHash: string;
  createdAt: number;
  updatedAt: number;
}

export interface ImpurityResult {
  impurityId: string;
  name: string;
  status: 'PASS' | 'FAIL' | 'UNCERTAIN';
  measured: number;
  limit: number;
  deviation: number;
  explanation: string;
}

export interface CheckResult {
  batchId: string;
  overallStatus: 'PASS' | 'FAIL' | 'PENDING';
  impurityResults: ImpurityResult[];
  explanation: string;
  retestAdvice?: string;
}

export interface ProcessError {
  code: string;
  userMessage: string;
  suggestion: string;
  missingFields?: string[];
}

export interface BalanceCalcInput {
  sampleWeight?: number;
  purity?: number;
  impurityWeight?: number;
}

export interface BalanceCalcOutput {
  theoreticalImpurityRatio?: number;
  dilutionFactor?: number;
}
