export interface RawParameterRecord {
  id: string;
  rowIndex: number;
  rawData: Record<string, string>;
  sourceFile: string;
  uploadedAt: number;
}

export interface CalculationStep {
  stepName: string;
  formula: string;
  inputs: Record<string, number>;
  output: number;
  description: string;
}

export interface UnitConversion {
  fromUnit: string;
  toUnit: string;
  factor: number;
  valueBefore: number;
  valueAfter: number;
}

export type BoundaryStatus = 'normal' | 'boundary' | 'anomaly';

export interface VerificationRecord {
  id: string;
  rawRecordId: string;
  stateName: string;
  weight: number;
  rawWeight: string;
  transitionProbability: number;
  rawProbability: string;
  boundaryStatus: BoundaryStatus;
  isZeroDivision: boolean;
  zeroDivisionReason?: string;
  calculationSteps: CalculationStep[];
  unitConversion?: UnitConversion;
  tempJudgment?: string;
  judgedAt?: number;
  judgeName?: string;
}

export interface FilterCriteria {
  boundaryStatus: BoundaryStatus[];
  isZeroDivision: boolean | null;
  weightRange: [number, number] | null;
  searchKeyword: string;
}

export interface Statistics {
  total: number;
  normalCount: number;
  boundaryCount: number;
  anomalyCount: number;
  zeroDivisionCount: number;
  filteredTotal: number;
}

export type ChangeType = 'parameter' | 'weight' | 'judgment' | 'filter';

export interface ChangeEntry {
  field: string;
  oldValue: string | number;
  newValue: string | number;
  changeType: ChangeType;
  reason?: string;
  timestamp: number;
  operatorName: string;
}

export interface HistoryVersion {
  id: string;
  version: string;
  versionNumber: number;
  createdAt: number;
  operatorName: string;
  description: string;
  rawRecords: RawParameterRecord[];
  verificationResults: VerificationRecord[];
  filterCriteria: FilterCriteria;
  changes: ChangeEntry[];
}

export interface UploadedFileInfo {
  name: string;
  size: number;
  uploadedAt: number;
  rowCount: number;
}
