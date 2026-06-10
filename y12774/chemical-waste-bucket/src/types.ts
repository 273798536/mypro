export interface Reagent {
  id: string;
  name: string;
  formula: string;
  concentration: number;
  concentrationUnit: 'mol/L' | 'g/L' | 'mg/mL' | '%';
  minSafeConcentration?: number;
  maxSafeConcentration?: number;
  volume: number;
  volumeUnit: 'mL' | 'L';
  hazardLevel: '低毒' | '中毒' | '高毒' | '剧毒';
  ph?: number;
  isConcentrationError?: boolean;
  concentrationErrorReason?: string;
}

export interface SpectrumData {
  id: string;
  dataType: 'HPLC' | 'GC' | 'IR' | 'UV' | 'NMR';
  measuredAt: string;
  hasAbnormality: boolean;
  abnormalityNote?: string;
  isSupplement?: boolean;
}

export interface BalanceCalculation {
  id: string;
  equation: string;
  isBalanced: boolean;
  calculatedAt: string;
  note?: string;
}

export type WasteCategory =
  | '有机废液'
  | '无机酸废液'
  | '无机碱废液'
  | '重金属废液'
  | '氧化性废液'
  | '还原性废液'
  | '含氰废液'
  | '其他';

export interface ExperimentRecord {
  id: string;
  experimentName: string;
  experimentDate: string;
  experimenter: string;
  courseName?: string;
  wasteCategory: WasteCategory;
  bucketNumber: string;
  reagents: Reagent[];
  manualNotes: string;
  spectrumData: SpectrumData[];
  balanceCalculations: BalanceCalculation[];
  hasAbnormalities: boolean;
  abnormalitySummary: string[];
  status: '草稿' | '已提交' | '复核通过' | '复核不通过';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewComment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ValidationResult {
  isValid: boolean;
  reagentId?: string;
  reagentName?: string;
  errorType: '浓度超限' | '浓度缺失' | '单位不匹配' | 'PH异常' | '其他';
  message: string;
  studentExplanation: string;
}

export interface WasteBucketSummary {
  bucketNumber: string;
  wasteCategory: WasteCategory;
  totalVolume: number;
  volumeUnit: 'mL' | 'L';
  recordCount: number;
  experiments: ExperimentRecord[];
  abnormalRecords: ExperimentRecord[];
  unusableRecords: ExperimentRecord[];
}
