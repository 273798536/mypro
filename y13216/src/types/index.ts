export type ConflictStatus = 'resolved' | 'pending_evidence' | 'pending_confirm';

export type HistoryAction =
  | 'create'
  | 'status_change'
  | 'remark_edit'
  | 'annotation_override'
  | 'append_note'
  | 'add_evidence'
  | 'confirm_pending';

export interface HistoryEntry {
  id: string;
  timestamp: string;
  operator: string;
  action: HistoryAction;
  fromValue?: string;
  toValue?: string;
  reason?: string;
}

export interface ScreenshotPlaceholder {
  id: string;
  name: string;
  sourceGroup: string;
  timestamp: string;
  description: string;
  gradient: string;
  icon: string;
}

export interface SupplementaryNote {
  id: string;
  content: string;
  operator: string;
  timestamp: string;
}

export interface ConflictRecord {
  id: string;
  title: string;
  conflictSummary: string;
  date: string;
  status: ConflictStatus;
  handler: string;
  screenshots: ScreenshotPlaceholder[];
  normalRecord: string;
  supplementaryNotes: SupplementaryNote[];
  currentRemark: string;
  history: HistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface FilterState {
  searchKeyword: string;
  trackFilter: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  statusFilter: 'all' | ConflictStatus;
  handlerFilter: string;
}

export const STATUS_LABEL: Record<ConflictStatus, string> = {
  resolved: '已处理',
  pending_evidence: '需补证据',
  pending_confirm: '挂起待确认',
};

export const HISTORY_ACTION_LABEL: Record<HistoryAction, string> = {
  create: '创建记录',
  status_change: '变更状态',
  remark_edit: '修改备注',
  annotation_override: '批注覆盖（触发挂起）',
  append_note: '追加后补说明',
  add_evidence: '补充证据',
  confirm_pending: '二次确认（解除挂起）',
};

export const OPERATORS = ['林姐', '张老师', '李老师', '王主任'] as const;
