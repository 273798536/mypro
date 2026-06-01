export type ScanStatus = 'draft' | 'pending' | 'confirmed' | 'anomaly';

export type AnomalyType = 'conflict' | 'timeout' | 'artifact_misjudgment';

export type AnomalySeverity = 'low' | 'medium' | 'high';

export type AnomalyStatus = 'pending' | 'confirmed' | 'resolved';

export type TissueType = 
  | 'white_matter'
  | 'gray_matter'
  | 'csf'
  | 'muscle'
  | 'fat'
  | 'bone'
  | 'tumor'
  | 'edema'
  | 'necrosis'
  | 'other';

export type ArtifactType =
  | 'motion'
  | 'susceptibility'
  | 'chemical_shift'
  | 'aliasing'
  | 'noise'
  | 'gradient_nonlinearity'
  | 'rf_feedthrough'
  | 'none';

export interface ScanParameter {
  id: string;
  scanType: string;
  tr: number;
  te: number;
  flipAngle: number;
  sliceThickness?: number;
  fov?: string;
  matrix?: string;
  bandwidth?: number;
  nex?: number;
  tissueType?: TissueType;
  artifactLabel?: ArtifactType;
  status: ScanStatus;
  createdAt: string;
  updatedAt: string;
}

export interface InterfaceResult {
  id: string;
  parameterId: string;
  interfaceName: string;
  resultData: {
    snr?: number;
    cnr?: number;
    tissueContrast?: number;
    scanTime?: number;
    artifactProbability?: number;
    recommended?: boolean;
    qualityScore?: number;
  };
  confidence: number;
  calculatedAt: string;
}

export interface Anomaly {
  id: string;
  parameterId: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  description: string;
  status: AnomalyStatus;
  handlerNote?: string;
  affectedInterfaces?: string[];
  createdAt: string;
}

export interface VersionHistory {
  id: string;
  parameterId: string;
  version: number;
  beforeData: Partial<ScanParameter>;
  afterData: Partial<ScanParameter>;
  modifiedBy: string;
  changeReason?: string;
  impactAnalysis?: {
    artifactInterpretationChange?: boolean;
    qualityScoreChange?: number;
    recommendationChange?: boolean;
  };
  createdAt: string;
}

export interface ComparisonDiff {
  field: string;
  interfaceA: string;
  valueA: any;
  interfaceB: string;
  valueB: any;
  difference: any;
}

export const TISSUE_TYPE_LABELS: Record<TissueType, string> = {
  white_matter: '白质',
  gray_matter: '灰质',
  csf: '脑脊液',
  muscle: '肌肉',
  fat: '脂肪',
  bone: '骨骼',
  tumor: '肿瘤',
  edema: '水肿',
  necrosis: '坏死组织',
  other: '其他',
};

export const ARTIFACT_TYPE_LABELS: Record<ArtifactType, string> = {
  motion: '运动伪影',
  susceptibility: '磁敏感伪影',
  chemical_shift: '化学位移伪影',
  aliasing: '卷绕伪影',
  noise: '噪声伪影',
  gradient_nonlinearity: '梯度非线性伪影',
  rf_feedthrough: 'RF馈通伪影',
  none: '无伪影',
};

export const ANOMALY_TYPE_LABELS: Record<AnomalyType, string> = {
  conflict: '参数冲突',
  timeout: '时间超限',
  artifact_misjudgment: '伪影误判',
};

export const ANOMALY_SEVERITY_LABELS: Record<AnomalySeverity, string> = {
  low: '低',
  medium: '中',
  high: '高',
};

export const SCAN_STATUS_LABELS: Record<ScanStatus, string> = {
  draft: '草稿',
  pending: '待确认',
  confirmed: '已确认',
  anomaly: '异常',
};

export const SCAN_TYPE_OPTIONS = [
  'T1加权成像 (T1WI)',
  'T2加权成像 (T2WI)',
  '质子密度加权 (PDWI)',
  '弥散加权成像 (DWI)',
  '灌注加权成像 (PWI)',
  '磁共振波谱 (MRS)',
  '磁敏感加权成像 (SWI)',
  '脂肪抑制序列',
];
