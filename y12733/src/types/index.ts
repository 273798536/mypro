export type DataStatus = 'available' | 'pending' | 'recollect';
export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface CondProbParam {
  id: string;
  condition: string;
  outcome: string;
  jointCount: number;
  conditionCount: number;
  probability: number;
  status: DataStatus;
  reviewStatus: ReviewStatus;
  explanation: string;
  isBoundary: boolean;
  boundaryNote?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ChangeLog {
  id: string;
  paramId: string;
  field: string;
  oldValue: string;
  newValue: string;
  reason: string;
  operator: string;
  timestamp: number;
  beforeStatus: ReviewStatus;
  afterStatus: ReviewStatus;
}

export interface ImportConflict {
  incoming: CondProbParam;
  existing: CondProbParam;
  resolution: 'keep' | 'overwrite' | 'skip';
}

export const DATA_STATUS_LABEL: Record<DataStatus, string> = {
  available: '可用',
  pending: '暂缓',
  recollect: '需重新采集',
};

export const REVIEW_STATUS_LABEL: Record<ReviewStatus, string> = {
  pending: '待确认',
  approved: '通过',
  rejected: '驳回',
};
