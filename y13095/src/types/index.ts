export type PointStatus = 'normal' | 'abnormal' | 'pending' | 'unchecked';

export type ActionType =
  | 'create'
  | 'update_status'
  | 'update_coord'
  | 'add_remark'
  | 'add_screenshot'
  | 'modify_judgment';

export interface Point {
  id: string;
  name: string;
  lng: number;
  lat: number;
  altitude: number;
  source: string;
  status: PointStatus;
  corridorId: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ViewCondition {
  centerLng: number;
  centerLat: number;
  zoom: number;
  filters: {
    status?: PointStatus[];
    corridorId?: string;
    searchText?: string;
  };
}

export interface HistoryRecord {
  id: string;
  pointId: string;
  operator: string;
  actionType: ActionType;
  oldValue?: string;
  newValue?: string;
  remark?: string;
  screenshot?: string;
  viewCondition?: ViewCondition;
  timestamp: string;
}

export interface ViewPreset {
  id: string;
  name: string;
  viewCondition: ViewCondition;
  createdBy: string;
  createdAt: string;
}

export interface OrphanScreenshot {
  id: string;
  pointId: string;
  imageUrl: string;
  lostReason: string;
  isRelinked: boolean;
  createdAt: string;
}

export interface Corridor {
  id: string;
  name: string;
  coordinates: { lng: number; lat: number }[];
}

export interface Operator {
  id: string;
  name: string;
  avatar?: string;
}

export const STATUS_LABELS: Record<PointStatus, string> = {
  normal: '正常',
  abnormal: '异常',
  pending: '待复核',
  unchecked: '未检查',
};

export const STATUS_COLORS: Record<PointStatus, string> = {
  normal: '#059669',
  abnormal: '#dc2626',
  pending: '#d97706',
  unchecked: '#6b7280',
};

export const ACTION_LABELS: Record<ActionType, string> = {
  create: '创建点位',
  update_status: '更新状态',
  update_coord: '更新坐标',
  add_remark: '添加备注',
  add_screenshot: '上传截图',
  modify_judgment: '修改判断',
};
