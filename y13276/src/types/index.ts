export type PointStatus = 'normal' | 'abnormal' | 'confirmed' | 'pending';

export type SourceType = 'gis_old' | 'attachment' | 'verbal';

export interface DataSource {
  id: string;
  type: SourceType;
  name: string;
  description: string;
  pointId: string;
  value: string;
  recordTime: string;
  recorder: string;
  position?: {
    lng: number;
    lat: number;
  };
}

export interface ConflictRecord {
  id: string;
  pointId: string;
  conflictingSourceIds: string[];
  conflictField: string;
  description: string;
}

export interface FirePoint {
  id: string;
  name: string;
  address: string;
  lng: number;
  lat: number;
  status: PointStatus;
  sourceIds: string[];
  currentValue: string;
  remark: string;
}

export interface Statistics {
  total: number;
  abnormal: number;
  confirmed: number;
  pending: number;
  bySource: Record<SourceType, number>;
}

export const sourceTypeLabels: Record<SourceType, string> = {
  gis_old: 'GIS旧版',
  attachment: '晚到附件',
  verbal: '口头备注',
};

export const statusLabels: Record<PointStatus, string> = {
  normal: '正常',
  abnormal: '异常',
  confirmed: '已确认',
  pending: '待复核',
};
