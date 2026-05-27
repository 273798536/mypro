export interface Channel {
  code: string;
  name: string;
  type: 'online' | 'offline' | 'agent';
}

export interface Product {
  code: string;
  name: string;
  category: 'consumer' | 'business' | 'mortgage';
}

export interface ApprovalNode {
  id: string;
  applicationId: string;
  nodeName: string;
  enterCount: number;
  passCount: number;
  rejectCount: number;
  timestamp: string;
}

export interface RejectionReason {
  id: string;
  applicationId: string;
  code: string;
  description: string;
  isOverwritten: boolean;
  originalDescription?: string;
  overwrittenAt?: string;
}

export interface Application {
  id: string;
  applicantName: string;
  channelCode: string;
  productCode: string;
  applyDate: string;
  status: 'approved' | 'rejected' | 'pending';
  nodes: ApprovalNode[];
  rejections: RejectionReason[];
}

export interface FunnelReport {
  id: string;
  period: string;
  generatedAt: string;
  snapshot: FunnelLayerData[];
}

export interface FunnelLayerData {
  nodeName: string;
  enterCount: number;
  passCount: number;
  rejectCount: number;
  conversionRate: number;
}

export interface CorrectionLog {
  id: string;
  targetId: string;
  targetType: 'application' | 'node' | 'rejection';
  field: string;
  oldValue: string;
  newValue: string;
  reason: string;
  operator: string;
  correctedAt: string;
}

export type AnomalyType = 'duplicate_node' | 'channel_mismatch' | 'reason_overwritten';

export interface Anomaly {
  id: string;
  type: AnomalyType;
  applicationId: string;
  description: string;
  severity: 'error' | 'warning';
  details: string;
}

export interface FilterState {
  channels: string[];
  products: string[];
  rejectionReasons: string[];
}
