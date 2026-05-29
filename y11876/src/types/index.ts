export type FieldErrorType = 'empty' | 'format' | 'out_of_range' | 'logic';

export interface FieldError {
  field: string;
  type: FieldErrorType;
  message: string;
}

export interface RawDataRow {
  id: string;
  rowNumber: number;
  category: string;
  date: string;
  forecast: number | null;
  lowerBound: number | null;
  upperBound: number | null;
  actual: number | null;
  isPromotion: boolean;
  remark: string;
  _raw: Record<string, any>;
  _errors: FieldError[];
  _isDirty: boolean;
}

export type AnomalyType = 'promotion' | 'low_sample' | 'under_coverage' | 'bad_forecast' | 'logic_error';

export type AnomalySeverity = 'high' | 'medium' | 'low';

export interface AnomalyItem {
  id: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  category: string;
  description: string;
  rowData: RawDataRow;
}

export interface BadExample {
  id: string;
  category: string;
  forecast: number;
  actual: number;
  lowerBound: number;
  upperBound: number;
  deviationPercent: number;
  reason: string;
}

export interface CategoryResult {
  category: string;
  coverage: number;
  sampleSize: number;
  validSampleSize: number;
  avgForecast: number;
  avgActual: number;
  avgIntervalWidth: number;
  underCoverageCount: number;
  overCoverageCount: number;
  medianSales: number;
}

export type GroupType = 'hot' | 'normal' | 'cold';

export interface GroupResult {
  group: GroupType;
  coverage: number;
  sampleSize: number;
  validSampleSize: number;
  threshold: number;
  originalCoverage: number;
  calibratedCoverage: number;
  calibrationFactor: number;
  categories: string[];
  avgUnderEstimation: number;
  avgIntervalWidthRatio: number;
}

export interface CalibrationCoeff {
  hotShrinkFactor: number;
  coldExpandFactor: number;
  normalAdjustFactor: number;
}

export interface CalibratedRow {
  originalRow: RawDataRow;
  calibratedLower: number;
  calibratedUpper: number;
  isCoveredOriginal: boolean;
  isCoveredCalibrated: boolean;
  group: GroupType;
}

export interface AnalysisResult {
  overallCoverage: number;
  targetCoverage: number;
  overallCalibratedCoverage: number;
  categoryResults: CategoryResult[];
  groupResults: GroupResult[];
  anomalies: AnomalyItem[];
  badExamples: BadExample[];
  dirtyRows: RawDataRow[];
  validRows: RawDataRow[];
  calibrationCoefficients: CalibrationCoeff;
  calibratedRows: CalibratedRow[];
  totalRows: number;
  validRowCount: number;
  dirtyRowCount: number;
  processedAt: Date;
}

export interface FieldMapping {
  forecast: string;
  actual: string;
  lowerBound: string;
  upperBound: string;
  category: string;
  date: string;
  isPromotion: string;
  remark: string;
}

export interface AppConfig {
  targetCoverage: number;
  hotThresholdPercentile: number;
  coldThresholdPercentile: number;
  minCategorySampleSize: number;
  minGroupSampleSize: number;
  badForecastDeviationThreshold: number;
  underCoverageRatioThreshold: number;
}

export interface FileInfo {
  name: string;
  size: number;
  type: string;
  columns: string[];
  rowCount: number;
}

export type PageType = 'upload' | 'analysis' | 'export';

export interface AppState {
  rawData: RawDataRow[];
  fieldMapping: FieldMapping;
  analysisResult: AnalysisResult | null;
  fileInfo: FileInfo | null;
  currentPage: PageType;
  selectedCategory: string | null;
  anomalyFilters: Set<AnomalyType>;
  isAnalyzing: boolean;
  uploadProgress: number;
  config: AppConfig;
  isDemoMode: boolean;
}

export interface AppActions {
  setRawData: (data: RawDataRow[]) => void;
  setFieldMapping: (mapping: FieldMapping) => void;
  setAnalysisResult: (result: AnalysisResult | null) => void;
  setFileInfo: (info: FileInfo | null) => void;
  setCurrentPage: (page: PageType) => void;
  setSelectedCategory: (category: string | null) => void;
  toggleAnomalyFilter: (type: AnomalyType) => void;
  setIsAnalyzing: (isAnalyzing: boolean) => void;
  setUploadProgress: (progress: number) => void;
  setConfig: (config: Partial<AppConfig>) => void;
  setIsDemoMode: (isDemo: boolean) => void;
  resetAll: () => void;
  runAnalysis: () => void;
}

export const DEFAULT_FIELD_MAPPING: FieldMapping = {
  forecast: '预测值',
  actual: '真实销量',
  lowerBound: '预测下限',
  upperBound: '预测上限',
  category: '品类',
  date: '日期',
  isPromotion: '是否促销',
  remark: '备注',
};

export const DEFAULT_CONFIG: AppConfig = {
  targetCoverage: 0.8,
  hotThresholdPercentile: 0.8,
  coldThresholdPercentile: 0.2,
  minCategorySampleSize: 30,
  minGroupSampleSize: 50,
  badForecastDeviationThreshold: 0.5,
  underCoverageRatioThreshold: 0.8,
};

export const ANOMALY_TYPE_LABELS: Record<AnomalyType, string> = {
  promotion: '促销异常',
  low_sample: '样本过少',
  under_coverage: '覆盖不足',
  bad_forecast: '明显坏值',
  logic_error: '逻辑错误',
};

export const ANOMALY_TYPE_COLORS: Record<AnomalyType, string> = {
  promotion: 'warning',
  low_sample: 'info',
  under_coverage: 'danger',
  bad_forecast: 'danger',
  logic_error: 'danger',
};

export const GROUP_LABELS: Record<GroupType, string> = {
  hot: '热门品类',
  normal: '普通品类',
  cold: '冷门品类',
};

export const GROUP_COLORS: Record<GroupType, { bg: string; text: string; border: string }> = {
  hot: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  normal: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  cold: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
};
