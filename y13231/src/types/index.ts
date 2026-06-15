export type ConflictStatus = 'pending' | 'processing' | 'resolved' | 'closed';

export type ChangeType = 'create' | 'update' | 'status_change' | 'note_change' | 'scan_add' | 'timecode_toggle';

export interface ContractScan {
  id: string;
  conflictId: string;
  fileName: string;
  fileData: string;
  remark: string;
  version: number;
  createdAt: string;
}

export interface NoteChange {
  id: string;
  conflictId: string;
  oldNote: string;
  newNote: string;
  operator: string;
  createdAt: string;
}

export interface HistoryVersion {
  id: string;
  conflictId: string;
  version: number;
  snapshot: Partial<ConflictRecord>;
  changeType: ChangeType;
  operator: string;
  changeDescription: string;
  createdAt: string;
}

export interface ConflictRecord {
  id: string;
  trackName: string;
  fileName: string;
  status: ConflictStatus;
  isTimecodeOffset: boolean;
  currentNote: string;
  contractScans: ContractScan[];
  historyVersions: HistoryVersion[];
  noteChanges: NoteChange[];
  createdAt: string;
  updatedAt: string;
}

export interface ConflictFilters {
  status?: ConflictStatus;
  isTimecodeOffset?: boolean;
  dateRange?: [string, string];
  keyword?: string;
}

export const STATUS_LABELS: Record<ConflictStatus, string> = {
  pending: '待处理',
  processing: '处理中',
  resolved: '已解决',
  closed: '已关闭',
};

export const STATUS_COLORS: Record<ConflictStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  processing: 'bg-blue-100 text-blue-800 border-blue-300',
  resolved: 'bg-success-100 text-success-800 border-success-300',
  closed: 'bg-gray-100 text-gray-800 border-gray-300',
};

export const CHANGE_TYPE_LABELS: Record<ChangeType, string> = {
  create: '创建记录',
  update: '更新信息',
  status_change: '状态变更',
  note_change: '备注修改',
  scan_add: '添加合同扫描件',
  timecode_toggle: '时码标记变更',
};
