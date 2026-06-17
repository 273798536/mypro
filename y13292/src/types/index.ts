export type ComplaintStatus = 'normal' | 'overload' | 'pending' | 'confirmed';

export type PointSource = 'system_import' | 'chat_record' | 'field_survey' | 'citizen_report';

export type TimelineEventType = 'complaint' | 'photo' | 'confirm' | 'overload' | 'update';

export interface ComplaintPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  source: PointSource;
  status: ComplaintStatus;
  description: string;
  capacity?: number;
  actualLoad?: number;
  createdAt: string;
  address?: string;
}

export interface PhotoRecord {
  id: string;
  complaintId: string;
  url: string;
  description: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface StatusChange {
  id: string;
  complaintId: string;
  fromStatus: ComplaintStatus;
  toStatus: ComplaintStatus;
  reason: string;
  operator: string;
  changedAt: string;
}

export interface TimelineEvent {
  id: string;
  complaintId: string;
  type: TimelineEventType;
  title: string;
  description: string;
  eventAt: string;
}

export interface DataPacket {
  id: string;
  name: string;
  description: string;
  pointCount: number;
  overloadCount: number;
}

export const statusLabels: Record<ComplaintStatus, string> = {
  normal: '正常',
  overload: '容量超限',
  pending: '待确认',
  confirmed: '已确认',
};

export const sourceLabels: Record<PointSource, string> = {
  system_import: '系统导入',
  chat_record: '聊天记录',
  field_survey: '现场勘测',
  citizen_report: '市民投诉',
};

export const eventTypeLabels: Record<TimelineEventType, string> = {
  complaint: '投诉登记',
  photo: '照片补录',
  confirm: '人工确认',
  overload: '超限预警',
  update: '信息更新',
};
