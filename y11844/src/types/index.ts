export interface Resources {
  budget: number;
  electricity: number;
  transport: number;
}

export type ActivityCategory = 'energy' | 'transport' | 'education' | 'planting';

export interface Activity {
  id: string;
  name: string;
  description: string;
  cost: Resources;
  carbonReduction: number;
  carbonEmission: number;
  delayRisk: number;
  isLowCarbon: boolean;
  category: ActivityCategory;
  maxTimesPerRound: number;
  icon: string;
  isAnomalySample?: boolean;
  anomalyType?: 'overdraft' | 'double_offset' | 'delay';
}

export interface ActivitySelection {
  activityId: string;
  count: number;
  round: number;
}

export type CarbonRecordType = 'emission' | 'reduction';

export interface CarbonRecord {
  id: string;
  round: number;
  type: CarbonRecordType;
  amount: number;
  source: string;
  sourceActivityId?: string;
  timestamp: number;
  isOffset: boolean;
  offsetId?: string;
  delayed?: boolean;
  effectiveRound?: number;
}

export type AnomalyType = 'overdraft' | 'double_offset' | 'delay';
export type AnomalySeverity = 'warning' | 'critical';

export interface AnomalyEvent {
  id: string;
  round: number;
  type: AnomalyType;
  severity: AnomalySeverity;
  description: string;
  activityId?: string;
  activityName?: string;
  detected: boolean;
  resolved: boolean;
  resolution?: string;
  detectedAt: number;
  data?: Record<string, number | string>;
}

export type DataSourceName = 'activity' | 'electricity';

export interface DataRecord {
  round: number;
  activityId?: string;
  activityName?: string;
  value: number;
  unit: string;
  field: string;
}

export interface DataSource {
  id: string;
  name: DataSourceName;
  maintainer: string;
  records: DataRecord[];
  lastUpdated: number;
}

export interface DataConflict {
  id: string;
  round: number;
  activityId?: string;
  activityName?: string;
  field: string;
  activityValue: number;
  electricityValue: number;
  diffPercent: number;
  resolved: boolean;
  chosenSource?: DataSourceName | 'manual';
  manualValue?: number;
  finalValue?: number;
}

export type GamePhase = 'home' | 'playing' | 'merging' | 'report' | 'demo';

export interface GameState {
  currentRound: number;
  totalRounds: number;
  phase: GamePhase;
  initialResources: Resources;
  currentResources: Resources;
  totalCarbonReduction: number;
  totalCarbonEmission: number;
  selectedActivities: ActivitySelection[];
  currentRoundSelections: ActivitySelection[];
  carbonLedger: CarbonRecord[];
  anomalies: AnomalyEvent[];
  dataSources: DataSource[];
  conflicts: DataConflict[];
  pendingDelayedReductions: PendingReduction[];
  score: {
    reduction: number;
    budget: number;
    compliance: number;
  };
  roundSummary: RoundSummary | null;
  showAnomalyAlert: boolean;
  currentAnomaly: AnomalyEvent | null;
}

export interface PendingReduction {
  id: string;
  activityId: string;
  activityName: string;
  amount: number;
  originalRound: number;
  effectiveRound: number;
  applied: boolean;
}

export interface RoundSummary {
  round: number;
  totalCost: Resources;
  carbonReduction: number;
  carbonEmission: number;
  netCarbon: number;
  anomalies: AnomalyEvent[];
  activities: ActivitySelection[];
}

export interface AnomalySample {
  id: string;
  anomalyType: AnomalyType;
  activity: Activity;
  expectedBehavior: string;
  verificationSteps: string[];
}
