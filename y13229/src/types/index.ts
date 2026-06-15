export type SplitStatus =
  | 'pending'
  | 'aligned'
  | 'suspended'
  | 'conflicted'
  | 'missing_note';

export type NoteSourceType = 'old_version' | 'manual_add' | 'verbal';

export type InfluenceType = NoteSourceType | 'system_check';

export interface TrackVersion {
  id: string;
  trackName: string;
  versionTag: string;
  isLatest: boolean;
  uploadedAt: string;
  uploadedBy: string;
  changeSummary: string;
  snapshot: {
    composer?: string;
    lyricist?: string;
    originalArtist?: string;
    workId?: string;
    notes?: string;
  };
}

export interface Note {
  id: string;
  splitRecordId: string;
  sourceType: NoteSourceType;
  content: string;
  createdBy: string;
  createdAt: string;
}

export interface Screenshot {
  id: string;
  splitRecordId: string;
  description: string;
  dataUrl: string;
  createdAt: string;
}

export interface ChangeLog {
  id: string;
  splitRecordId: string;
  fieldName: string;
  oldValue: unknown;
  newValue: unknown;
  changedBy: string;
  changedAt: string;
  changeReason: string;
}

export interface TraceNode {
  id: string;
  splitRecordId: string;
  influenceType: InfluenceType;
  description: string;
  orderIndex: number;
}

export interface SplitRecord {
  id: string;
  trackVersionId: string;
  performanceName: string;
  performanceDate: string;
  artistRatio: number;
  venueRatio: number;
  distributionRatio: number;
  authExpiryDate: string;
  status: SplitStatus;
  humanReason: string;
  confirmedBy?: string;
  confirmedAt?: string;
}

export interface FilterState {
  trackName: string;
  performanceName: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  statusFilter: SplitStatus | 'all';
  savedAt: string;
}

export interface AppDataState {
  trackVersions: TrackVersion[];
  splitRecords: SplitRecord[];
  notes: Note[];
  screenshots: Screenshot[];
  changeLogs: ChangeLog[];
  traceNodes: TraceNode[];
  filterState: FilterState;
  currentUser: string;
  sampleLoaded: boolean;
}

export const DEFAULT_FILTER: FilterState = {
  trackName: '',
  performanceName: '',
  dateRangeStart: '',
  dateRangeEnd: '',
  statusFilter: 'all',
  savedAt: '',
};

export const STATUS_LABEL: Record<SplitStatus, string> = {
  pending: '待确认',
  aligned: '已对齐',
  suspended: '已挂起',
  conflicted: '版本冲突',
  missing_note: '备注待补',
};

export const NOTE_SOURCE_LABEL: Record<NoteSourceType, string> = {
  old_version: '旧版曲目表带入',
  manual_add: '后补人工备注',
  verbal: '口头备注转录',
};

export const INFLUENCE_LABEL: Record<InfluenceType, string> = {
  old_version: '旧版曲目表',
  manual_add: '后补备注',
  verbal: '口头备注',
  system_check: '系统校验',
};
