export type SnapshotStatus = 'pending' | 'approved' | 'need_supplement' | 'gray_error';

export type ChangeType = 'added' | 'removed' | 'modified' | 'none';

export type JudgmentResult = 'pass' | 'need_supplement';

export interface Snapshot {
  id: string;
  name: string;
  modelVersion: string;
  status: SnapshotStatus;
  hasGrayError: boolean;
  createdBy: string;
  createdAt: string;
  remark: string;
  stepCount: number;
  changeCount: number;
  grayRatio?: string;
}

export interface Step {
  id: string;
  snapshotId: string;
  stepIndex: number;
  stepName: string;
  description: string;
  parameters: Record<string, any>;
  hasChange: boolean;
  changeType: ChangeType;
  changeDetail?: string;
}

export interface Note {
  id: string;
  snapshotId: string;
  stepId?: string;
  content: string;
  createdBy: string;
  createdAt: string;
}

export interface Judgment {
  id: string;
  snapshotId: string;
  modelVersion: string;
  result: JudgmentResult;
  comment: string;
  judgedBy: string;
  judgedAt: string;
}

export interface FilterState {
  status: SnapshotStatus | 'all';
  hasGrayError: boolean | 'all';
  modelVersion: string;
  searchKeyword: string;
  dateRange: {
    start: string;
    end: string;
  } | null;
}
