// 共享类型：前后端共用的领域模型与 API 契约

export type Source =
  | 'normal'
  | 'old_plan_override'
  | 'resident_feedback'
  | 'on_site_photo'
  | 'manual_override';

export type RampStatus = 'processed' | 'pending' | 'overridden';

export const SOURCE_LABELS: Record<Source, string> = {
  normal: '正常材料',
  old_plan_override: '旧方案覆盖新意见',
  resident_feedback: '居民反馈',
  on_site_photo: '现场照片',
  manual_override: '人工改判',
};

export const STATUS_LABELS: Record<RampStatus, string> = {
  processed: '已处理',
  pending: '待补材料',
  overridden: '人工改判',
};

export interface RampListItem {
  id: string;
  name: string;
  bridgeName: string;
  address: string;
  lat: number;
  lng: number;
  status: RampStatus;
  sources: Source[];
  isOverriding: boolean;
  lastChangeAt: string | null;
  lastChangeSource: Source | null;
  lastAffected: string | null;
  changeCount: number;
}

export interface ChangeLog {
  id: string;
  rampId: string;
  itemId: string | null;
  source: Source;
  previousStatus: RampStatus | null;
  newStatus: RampStatus;
  note: string;
  affectedSummary: string;
  operator: string;
  createdAt: string;
}

export interface Item {
  id: string;
  rampId: string;
  title: string;
  source: Source;
  content: string;
  photoUrl: string | null;
  isOverriding: boolean;
  submittedAt: string;
}

export interface FeedbackNote {
  id: string;
  content: string;
  isGrayscale: boolean;
  affectsRamps: string[];
  createdAt: string;
}

export interface RampDetail {
  ramp: RampListItem;
  items: Item[];
  changeLogs: ChangeLog[];
  feedbackNotes: FeedbackNote[];
}

// 后端每次变更返回的「不止成功」：来源、前后状态、影响哪些判断、改判记录
export interface ChangeResult {
  ok: boolean;
  message: string;
  rampId: string;
  previousStatus: RampStatus | null;
  newStatus: RampStatus;
  source: Source;
  affectedSummary: string;
  changeLog: ChangeLog;
}

export interface ListRunResult {
  ok: boolean;
  message: string;
  runType: 'generate' | 'rerun';
  total: number;
  processed: number;
  pending: number;
  overridden: number;
  reconciled: number; // 重跑时被重新对齐的坡道数
  runAt: string;
}

export interface RampsQuery {
  source?: Source;
  status?: RampStatus;
  overriding?: boolean;
}
