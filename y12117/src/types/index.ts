export type FieldType = 'time' | 'metric' | 'group' | 'unknown';

export interface FieldInfo {
  name: string;
  type: FieldType;
  sampleValues: (string | number)[];
}

export interface SourceInfo {
  file: string;
  rowIndex: number;
  fields: string[];
}

export interface DataRow {
  [key: string]: string | number | Date | null | SourceInfo[] | undefined;
  __sourceFile: string;
  __rowIndex: number;
  __sourceFiles?: SourceInfo[];
}

export interface UploadedFile {
  id: string;
  name: string;
  rows: DataRow[];
  fields: FieldInfo[];
}

export interface AnalysisParams {
  timeField: string;
  groupFields: string[];
  metricFields: string[];
  timeRange: { start: Date | null; end: Date | null };
  maxLag: number;
  correlationThreshold: number;
  trendThreshold: number;
}

export interface CorrelationResult {
  variable1: string;
  variable2: string;
  correlation: number;
  pValue: number;
  isSignificant: boolean;
}

export interface LagResult {
  variable1: string;
  variable2: string;
  bestLag: number;
  maxCorrelation: number;
  correlations: number[];
  warning: 'lag_detected' | 'no_lag' | 'insufficient_data';
  sourceRows: { file: string; rowIndex: number; value: number }[];
}

export interface TrendResult {
  groupId: string;
  variables: string[];
  trendStrength: number;
  pattern: 'upward' | 'downward' | 'stable' | 'complex';
  warning: 'common_trend' | 'no_trend';
  sourceRows: { file: string; rowIndex: number; values: number[] }[];
}

export interface Warning {
  id: string;
  type: 'lag' | 'trend' | 'spurious_correlation';
  severity: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  sourceFile: string;
  sourceRows: number[];
  relatedVariables: string[];
}

export interface AnalysisResult {
  correlationMatrix: CorrelationResult[];
  lagResults: LagResult[];
  trendResults: TrendResult[];
  warnings: Warning[];
  alignedData: DataRow[];
}

export type TabType = 'correlation' | 'lag' | 'trend' | 'warnings' | 'data';

export interface AppState {
  uploadedFiles: UploadedFile[];
  analysisParams: AnalysisParams;
  analysisResult: AnalysisResult | null;
  isAnalyzing: boolean;
  activeTab: TabType;
  selectedWarning: Warning | null;
}
