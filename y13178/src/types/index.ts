export type RecordType = 'old_note' | 'normal' | 'verbal';

export type ExceptionStatus = 'resolved' | 'pending_material' | 'manual_overrule';

export type ViewMode = 'manager' | 'engineer';

export type JumpReason = 'threshold' | 'unit' | 'normal_record';

export interface SpeckleRecord {
  id: string;
  date: string;
  value: number;
  type: RecordType;
  source: string;
  content: string;
  impactWeight: number;
  isThresholdChanged?: boolean;
  thresholdBefore?: number;
  thresholdAfter?: number;
  unitChanged?: boolean;
  unitBefore?: string;
  unitAfter?: string;
  isJumpPoint?: boolean;
  jumpReason?: JumpReason;
}

export interface ExceptionItem {
  id: string;
  recordId: string;
  title: string;
  description: string;
  status: ExceptionStatus;
  type: RecordType;
  createdAt: string;
  assignee?: string;
}

export interface SceneAnnotation {
  id: string;
  title: string;
  description: string;
  dateRange: [string, string];
  records: string[];
}
