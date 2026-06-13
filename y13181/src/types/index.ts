export type DataStatus = 'normal' | 'warning' | 'critical';

export type JudgeResult = 'none' | 'normal' | 'noise' | 'pending';

export type MarkType = 'noise' | 'old_note' | 'name_mismatch' | 'verbal_note' | 'pending' | 'manual';

export interface TowerData {
  id: string;
  towerId: string;
  dropletValue: number;
  threshold: number;
  deviation: number;
  status: DataStatus;
  timestamp: string;
  materialName: string;
  standardMaterialName?: string;
  isNoiseSuspected: boolean;
  isOldNote: boolean;
  isNameMismatch: boolean;
  isVerbalNote: boolean;
  judgeResult: JudgeResult;
  judgeReason: string;
  judgeOperator?: string;
  judgeTime?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceNote {
  id: string;
  dataId: string;
  content: string;
  version: string;
  isCurrent: boolean;
  author: string;
  createdAt: string;
}

export interface ProcessRecord {
  id: string;
  dataId: string;
  action: string;
  operator: string;
  remark: string;
  timestamp: string;
}

export interface ParamVersion {
  version: string;
  updatedAt: string;
  description: string;
  hasDiff: boolean;
  diffItems?: string[];
}

export interface StatsSummary {
  total: number;
  normal: number;
  warning: number;
  critical: number;
  noiseSuspected: number;
  oldNote: number;
  nameMismatch: number;
  verbalNote: number;
  pending: number;
  manualJudged: number;
  processed: number;
}

export interface FilterOptions {
  status?: DataStatus | 'all';
  markType?: MarkType | 'all';
  searchKeyword?: string;
  dateRange?: [string, string];
  judgeResult?: JudgeResult | 'all';
}
