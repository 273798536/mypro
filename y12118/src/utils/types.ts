export interface Channel {
  id: string;
  name: string;
  dailyCap: number;
  cpaBid: number;
  conversionRate: number;
  conversionDelayDays: number;
  efficiencyAlpha: number;
}

export interface Material {
  id: string;
  name: string;
  channelId: string;
  tags: string[];
}

export interface OptimizationStep {
  round: number;
  action: "allocate" | "skip_cap" | "skip_all_capped";
  constraintType: "none" | "cap" | "delay" | "duplicate" | "all_capped";
  channelId: string;
  deltaBudget: number;
  marginalReturnBefore: number;
  marginalReturnAfter: number;
  explanation: string;
}

export interface MarginalReturnPoint {
  budget: number;
  marginalReturn: number;
}

export interface BudgetReplayEntry {
  round: number;
  channelId: string;
  delta: number;
  remainingBudget: number;
}

export interface Anomaly {
  type: "budget_exhausted" | "conversion_delay" | "material_duplicate";
  severity: "warning" | "critical";
  explanation: string;
  relatedMaterialIds?: string[];
}

export interface AllocationResult {
  channelId: string;
  channelName: string;
  allocatedBudget: number;
  dailyCap: number;
  capReached: boolean;
  marginalReturn: number;
  expectedConversions: number;
  delayDiscount: number;
  duplicatePenalty: number;
  anomalies: Anomaly[];
  optimizationSteps: OptimizationStep[];
  marginalReturnCurve: MarginalReturnPoint[];
  budgetReplay: BudgetReplayEntry[];
}

export interface AllocationOutput {
  totalBudget: number;
  remainingBudget: number;
  results: AllocationResult[];
  globalSummary: string;
  totalExpectedConversions: number;
  totalRounds: number;
}

export type ScenarioPreset =
  | "smooth"
  | "budget_exhausted"
  | "conversion_delay"
  | "material_duplicate";
