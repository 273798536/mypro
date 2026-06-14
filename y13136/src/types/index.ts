export interface RawParameterRecord {
  id: string;
  rowIndex: number;
  rawData: Record<string, string>;
  sourceFile: string;
  uploadedAt: number;
}

export type ZeroDivisionSource =
  | 'transition_count_sum'        // 转移计数求和=0，归一化时触发
  | 'steady_state_denominator'    // 稳态求解分母=0
  | 'weight_normalize_sum'        // 权重归一化分母=0
  | 'probability_raw_zero'        // 原始输入概率就是 0 或接近 0
  | 'weight_raw_zero';            // 原始输入权重就是 0 或接近 0

export interface CalculationStep {
  stepName: string;
  formula: string;
  inputs: Record<string, number | string>;
  output: number;
  description: string;
  isZeroDivision?: boolean;
  zeroDivisionSource?: ZeroDivisionSource;
  zeroDivisionDetail?: string;
  unitConversionId?: string;      // 引用本次换算
}

export interface UnitConversion {
  id: string;
  fromUnit: string;
  toUnit: string;
  factor: number;
  valueBefore: number;
  valueAfter: number;
  appliedField: 'weight' | 'probability' | 'both';
  note?: string;
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
  zeroDivisionSources: ZeroDivisionSource[];  // 所有触发除零的来源
  calculationSteps: CalculationStep[];
  unitConversions: UnitConversion[];
  tempJudgment?: string;
  judgedAt?: number;
  judgeName?: string;
  parseError?: string;               // 解析失败时的错误提示
  computeError?: string;             // 计算失败时的错误提示
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
  parseErrorCount: number;
  computeErrorCount: number;
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
