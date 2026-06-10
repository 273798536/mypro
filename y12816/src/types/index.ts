export type SampleSource = '共享盘复核' | '旧样本表' | '显微照片备注' | '手动录入';
export type SampleStatus = '待计算' | '计算完成' | '需人工复核' | '质控通过' | '质控不通过';
export type QcStepStatus = 'pending' | 'running' | 'passed' | 'failed';

export interface Sample {
  id: string;
  barcode: string;
  type: string;
  source: SampleSource;
  status: SampleStatus;
  totalReads: number;
  mutantReads: number;
  coverage: number;
  qualityScore: number;
  conclusion: string;
  reviewNote?: string;
  photoNote?: string;
  targetRegionLength?: number;
  hasBadData?: boolean;
  badDataType?: string;
}

export interface CalculationResult {
  sampleBarcode: string;
  mutationFrequency: number;
  alleleFrequency: number;
  coverageDepth: number;
  formula: string;
  unit: string;
  applicableRange: string;
  failureReason?: string;
  isPass: boolean;
}

export interface CalculationParams {
  minQualityScore: number;
  minCoverageDepth: number;
  mutationFrequencyThreshold: number;
  targetRegionLength: number;
}

export interface ImageAnnotation {
  sampleBarcode: string;
  beforeAnnotation: string;
  afterAnnotation: string;
  diffDescription: string;
  timestamp: string;
  operator: string;
  beforeMutationCall: string;
  afterMutationCall: string;
}

export interface QcStep {
  id: string;
  name: string;
  status: QcStepStatus;
  description: string;
  resultDetail?: string;
}

export interface EdgeCase {
  id: string;
  title: string;
  category: '条码重复' | '低质量读段' | '其他';
  description: string;
  beforeCondition: Record<string, string | number>;
  afterCondition: Record<string, string | number>;
  beforeResult: string;
  afterResult: string;
  beforeConclusion: '阳性' | '阴性' | '不确定';
  afterConclusion: '阳性' | '阴性' | '不确定';
  doesChangeResult: true;
  impactExplanation: string;
}

export interface SampleChangeLog {
  id: string;
  sampleBarcode: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  oldMutationFrequency: number;
  newMutationFrequency: number;
  oldConclusion: string;
  newConclusion: string;
  timestamp: string;
  operator: string;
}

export interface FormulaMeta {
  name: string;
  expression: string;
  variables: Array<{ symbol: string; meaning: string; unit: string }>;
  unit: string;
  applicableRange: string;
  failureReasons: string[];
}
