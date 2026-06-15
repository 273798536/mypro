export const VoicePart = {
  SOPRANO: 'soprano',
  ALTO: 'alto',
  TENOR: 'tenor',
  BASS: 'bass',
} as const;

export type VoicePart = (typeof VoicePart)[keyof typeof VoicePart];

export const VoicePartLabels: Record<VoicePart, string> = {
  [VoicePart.SOPRANO]: '女高音',
  [VoicePart.ALTO]: '女低音',
  [VoicePart.TENOR]: '男高音',
  [VoicePart.BASS]: '男低音',
};

export const AlertLevel = {
  NORMAL: 'normal',
  WARNING: 'warning',
  CRITICAL: 'critical',
} as const;

export type AlertLevel = (typeof AlertLevel)[keyof typeof AlertLevel];

export const AlertLevelLabels: Record<AlertLevel, string> = {
  [AlertLevel.NORMAL]: '正常',
  [AlertLevel.WARNING]: '提醒',
  [AlertLevel.CRITICAL]: '异常',
};

export const RecordStatus = {
  PENDING: 'pending',
  REVIEWED: 'reviewed',
  RESOLVED: 'resolved',
} as const;

export type RecordStatus = (typeof RecordStatus)[keyof typeof RecordStatus];

export const RecordStatusLabels: Record<RecordStatus, string> = {
  [RecordStatus.PENDING]: '待处理',
  [RecordStatus.REVIEWED]: '已复核',
  [RecordStatus.RESOLVED]: '已解决',
};

export const VersionSource = {
  LATEST: 'latest',
  OLD_MASTER: 'old_master',
  UNKNOWN: 'unknown',
} as const;

export type VersionSource = (typeof VersionSource)[keyof typeof VersionSource];

export const VersionSourceLabels: Record<VersionSource, string> = {
  [VersionSource.LATEST]: '最新版本',
  [VersionSource.OLD_MASTER]: '旧版母带混入',
  [VersionSource.UNKNOWN]: '来源待确认',
};

export interface ScreenshotAttachment {
  id: string;
  fileName: string;
  dataUrl: string;
  uploadedAt: string;
  isLate: boolean;
  note?: string;
}

export interface VersionInfo {
  versionId: string;
  source: VersionSource;
  detectedAt: string;
  fileHash?: string;
  originalFileName: string;
  suggestion: string;
  shouldOverride: boolean;
}

export interface ManualNote {
  id: string;
  content: string;
  author: string;
  createdAt: string;
  updatedAt: string;
}

export const ActionType = {
  CREATE: 'create',
  UPDATE_STATUS: 'update_status',
  UPDATE_LEVEL: 'update_level',
  ADD_NOTE: 'add_note',
  UPDATE_NOTE: 'update_note',
  DETECT_VERSION: 'detect_version',
  ADD_ATTACHMENT: 'add_attachment',
  UPDATE_JUDGMENT: 'update_judgment',
} as const;

export type ActionType = (typeof ActionType)[keyof typeof ActionType];

export interface HistoryAction {
  id: string;
  recordId: string;
  actionType: ActionType;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  operator: string;
  timestamp: string;
  description: string;
}

export interface ChorusAlertRecord {
  id: string;
  title: string;
  studentName: string;
  voicePart: VoicePart;
  alertLevel: AlertLevel;
  status: RecordStatus;
  rehearsalDate: string;
  detectedIssue: string;
  improvementNote?: string;
  screenshots: ScreenshotAttachment[];
  versionInfo?: VersionInfo;
  manualNotes: ManualNote[];
  operatorOverride?: {
    overrideLevel?: AlertLevel;
    overrideNote?: string;
    operator: string;
    timestamp: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface FilterCriteria {
  voicePart?: VoicePart;
  alertLevel?: AlertLevel;
  status?: RecordStatus;
  versionSource?: VersionSource;
  hasLateAttachment?: boolean;
  hasOldMaster?: boolean;
  studentName?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface AppState {
  records: ChorusAlertRecord[];
  filterCriteria: FilterCriteria;
  selectedRecordId: string | null;
  history: HistoryAction[];
}

export const defaultFilterCriteria: FilterCriteria = {};
