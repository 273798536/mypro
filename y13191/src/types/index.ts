export interface SensorLog {
  id: string;
  rawLineNumber: number;
  deviceId: string;
  deviceIdField: string;
  resistance: number | null;
  resistanceField: string;
  resistanceUnit: string;
  temperature: number | null;
  temperatureField: string;
  timestamp: string;
  timestampField: string;
  manualRemark: string | null;
  manualRemarkField: string;
  manualOperator: string | null;
  manualOperatorField: string;
  rawData: Record<string, any>;
}

export interface FieldMapping {
  deviceId: string;
  resistance: string;
  temperature: string;
  timestamp: string;
  manualRemark: string;
  manualOperator: string;
}

export interface FieldMappingResult {
  mapping: FieldMapping;
  detectedFields: Record<string, string[]>;
  unmatchedFields: string[];
}

export interface ThresholdParams {
  name: string;
  warningThreshold: number;
  thresholdUnit: 'mΩ' | 'Ω' | 'kΩ';
  temperatureCompensation: boolean;
  baseTemperature: number;
  temperatureCoefficient: number;
}

export interface CalculationStep {
  stepId: string;
  description: string;
  formula: string;
  inputValue: number;
  inputUnit: string;
  outputValue: number;
  outputUnit: string;
  conversion?: string;
}

export interface ThresholdResult {
  logId: string;
  rawLineNumber: number;
  deviceId: string;
  thresholdValue: number;
  thresholdUnit: string;
  measuredValue: number;
  measuredUnit: string;
  isWarning: boolean;
  calculationSteps: CalculationStep[];
  hasQualityIssue: boolean;
}

export interface QualityIssue {
  issueId: string;
  logId: string;
  rawLineNumber: number;
  deviceId: string;
  issueType: 'duplicate' | 'bad_data' | 'missing_field' | 'out_of_range';
  description: string;
  severity: 'warning' | 'error';
  rawReference: string;
}

export interface OverrideAnalysis {
  logId: string;
  rawLineNumber: number;
  deviceId: string;
  autoJudgement: 'normal' | 'warning';
  manualJudgement: 'normal' | 'warning' | null;
  manualRemark: string | null;
  operator: string | null;
  impactDescription: string;
  impactScore: number;
  isConsistent: boolean;
}

export interface AnalysisReport {
  reportId: string;
  generatedAt: string;
  dataSource: string;
  totalRecords: number;
  validRecords: number;
  warningCount: number;
  normalCount: number;
  overrideCount: number;
  inconsistencyCount: number;
  qualityIssueCount: number;
  markdownContent: string;
}

export interface AnalysisState {
  rawLogs: SensorLog[];
  fieldMappingResult: FieldMappingResult | null;
  thresholdParamsA: ThresholdParams;
  thresholdParamsB: ThresholdParams;
  resultsA: ThresholdResult[];
  resultsB: ThresholdResult[];
  qualityIssues: QualityIssue[];
  overrideAnalysis: OverrideAnalysis[];
  currentReport: AnalysisReport | null;
  selectedLogId: string | null;
  isAnalyzing: boolean;
  fileName: string;
}

export const FIELD_SYNONYMS: Record<string, string[]> = {
  deviceId: ['设备编号', '设备ID', 'device_id', 'DeviceID', 'deviceId', '设备号', '编号'],
  resistance: ['内阻', '电阻', 'resistance', 'Resistance', '电阻值', '内阻值', '电池内阻'],
  temperature: ['温度', 'temperature', 'Temperature', '温度值', '采集温度'],
  timestamp: ['时间', '时间戳', 'timestamp', 'Timestamp', '采集时间', '记录时间'],
  manualRemark: ['备注', '人工备注', 'remark', 'Remark', '处理备注', '判定备注'],
  manualOperator: ['操作人', '处理人', 'operator', 'Operator', '改判人', '审核人'],
};

export const UNIT_FACTORS: Record<string, number> = {
  'mΩ': 0.001,
  'Ω': 1,
  'KΩ': 1000,
  'kΩ': 1000,
  '毫欧': 0.001,
  '欧': 1,
  '千欧': 1000,
};
