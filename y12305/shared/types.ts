export type TariffTableType = 'step' | 'tou';
export type PeriodType = 'peak' | 'valley' | 'flat' | 'none';

export interface TariffTier {
  tierId: string;
  tierName: string;
  minKwh: number;
  maxKwh: number | null;
  pricePerKwh: number;
  periodType: PeriodType;
}

export interface TariffTable {
  id: string;
  name: string;
  type: TariffTableType;
  effectiveFrom: string;
  effectiveTo: string;
  tiers: TariffTier[];
  isExpired: boolean;
  createdAt: string;
}

export interface UsageRecord {
  id: string;
  recordDate: string;
  totalBill: number;
  peakUsage?: number;
  valleyUsage?: number;
  flatUsage?: number;
  totalUsage?: number;
  customerNote?: string;
  sourceFile: string;
  importedAt: string;
}

export interface TierCalculation {
  tierId: string;
  tierName: string;
  periodType: PeriodType;
  pricePerKwh: number;
  billedKwh: number;
  billedAmount: number;
  formula: string;
  tierRange: string;
  calculationMode: 'reverse' | 'forward';
}

export type WarningType = 'expired_tariff' | 'negative_usage' | 'boundary_tier' | 'mismatch_total' | 'tariff_boundary' | 'missing_period_usage' | 'period_sum_mismatch' | 'bill_mismatch' | 'unknown_period_type';
export type WarningSeverity = 'error' | 'warning' | 'info';

export interface CalculationWarning {
  type: WarningType;
  severity: WarningSeverity;
  message: string;
  sourceField: string;
  sourceValue: unknown;
  traceId: string;
}

export interface CalculationVersion {
  id: string;
  name: string;
  tariffTableId: string;
  usageRecordId: string;
  totalBill: number;
  calculatedTotal: number;
  discrepancy: number;
  totalCalculatedKwh: number;
  tierResults: TierCalculation[];
  warnings: CalculationWarning[];
  createdAt: string;
  createdBy: string;
  note: string;
}

export type TraceNodeType = 'result' | 'tier_calc' | 'input' | 'tariff' | 'warning';

export interface TraceNode {
  id: string;
  type: TraceNodeType;
  label: string;
  value: unknown;
  formula?: string;
  sourceRef: string;
  description?: string;
  children: TraceNode[];
}

export interface CalculateRequest {
  tariffTableId: string;
  usageRecordId: string;
  versionName: string;
  note?: string;
}

export interface VersionComparison {
  versionA: CalculationVersion;
  versionB: CalculationVersion;
  differences: {
    field: string;
    valueA: unknown;
    valueB: unknown;
  }[];
  tierDifferences: {
    tierId: string;
    field: string;
    valueA: unknown;
    valueB: unknown;
  }[];
}
