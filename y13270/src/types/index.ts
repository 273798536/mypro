export interface RawPoint {
  id: string;
  source: string;
  sourceLine: number;
  rawName: string;
  rawLat: number;
  rawLng: number;
  rawData: Record<string, any>;
  influenceRadius: number;
  isOffset: boolean;
  offsetDistance: number;
  importBatch: string;
  createdAt: string;
}

export type PointStatus = 'pending' | 'confirmed' | 'onsite' | 'conflict';

export interface Note {
  id: string;
  content: string;
  isSupplementary: boolean;
  createdAt: string;
}

export interface MergedPoint {
  id: string;
  canonicalName: string;
  status: PointStatus;
  rawPointIds: string[];
  canonicalLat: number;
  canonicalLng: number;
  notes: Note[];
  hasSupplementaryNote: boolean;
  createdAt: string;
  updatedAt: string;
}

export type HistoryAction = 'import' | 'confirm' | 'withdraw' | 'merge' | 'note' | 'status';

export interface HistoryRecord {
  id: string;
  action: HistoryAction;
  targetType: 'rawPoint' | 'mergedPoint';
  targetId: string;
  before: any;
  after: any;
  operator: string;
  timestamp: string;
}

export interface AppState {
  rawPoints: RawPoint[];
  mergedPoints: MergedPoint[];
  history: HistoryRecord[];
  currentBatch: string;
}

export interface StoreActions {
  importRawPoints: (points: Omit<RawPoint, 'id' | 'createdAt' | 'importBatch'>[], source: string) => void;
  confirmPoint: (id: string) => void;
  markOnsite: (id: string) => void;
  markConflict: (id: string) => void;
  withdrawStatus: (id: string) => void;
  mergePoints: (rawPointIds: string[], canonicalName: string, canonicalLat: number, canonicalLng: number) => void;
  addNote: (mergedPointId: string, content: string, isSupplementary: boolean) => void;
  loadDemoData: () => void;
  clearAllData: () => void;
  exportHistory: () => string;
  exportHistoryCSV: () => string;
}

export type PointStore = AppState & StoreActions;

export const STATUS_LABELS: Record<PointStatus, string> = {
  pending: '待复核',
  confirmed: '已处理',
  onsite: '待现场看',
  conflict: '冲突记录',
};

export const STATUS_COLORS: Record<PointStatus, string> = {
  pending: 'bg-gray-100 text-gray-700 border-gray-300',
  confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  onsite: 'bg-amber-50 text-amber-700 border-amber-300',
  conflict: 'bg-orange-50 text-orange-700 border-orange-300',
};

export const STATUS_BORDER_COLORS: Record<PointStatus, string> = {
  pending: 'border-l-gray-400',
  confirmed: 'border-l-emerald-500',
  onsite: 'border-l-amber-500',
  conflict: 'border-l-orange-500',
};

export const ACTION_LABELS: Record<HistoryAction, string> = {
  import: '数据导入',
  confirm: '确认归并',
  withdraw: '撤回操作',
  merge: '点位归并',
  note: '添加备注',
  status: '状态变更',
};
