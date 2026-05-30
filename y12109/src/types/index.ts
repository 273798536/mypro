export interface PolicySample {
  id: string;
  premium: number;
  sumInsured: number;
  claimCount: number;
  claimAmounts: number[];
  lineOfBusiness: string;
}

export interface SimulationParams {
  deductible: number;
  limit: number;
  expenseRatio: number;
  safetyLoading: number;
  iterations: number;
}

export interface ExtremeClaim {
  simulationIndex: number;
  rawAmount: number;
  cappedAmount: number;
  deductibleApplied: number;
  sourcePolicyId: string;
  sourceField: string;
  severity: 'high' | 'critical';
  interceptType: 'deductible' | 'limit' | 'uncaught';
}

export interface SampleWarning {
  type: 'insufficient_sample' | 'deductible_boundary' | 'thin_tail';
  message: string;
  affectedPolicies: string[];
  suggestedAction: string;
}

export interface SimulationResult {
  purePremium: number;
  grossPremium: number;
  combinedRatio: number;
  var95: number;
  var99: number;
  tvar95: number;
  tvar99: number;
  lossDistribution: number[];
  extremeClaims: ExtremeClaim[];
  sampleWarnings: SampleWarning[];
  meanLoss: number;
  stdLoss: number;
  iterations: number;
}

export interface SensitivityResult {
  paramName: string;
  paramDelta: number;
  originalResult: SimulationResult;
  newResult: SimulationResult;
  premiumDelta: number;
  premiumDeltaPct: number;
}

export interface SimulationState {
  policies: PolicySample[];
  params: SimulationParams;
  result: SimulationResult | null;
  sensitivityResults: SensitivityResult[];
  isRunning: boolean;
  progress: number;
  error: string | null;
}
