export type GisPointStatus = 'normal' | 'conflict' | 'incomplete';
export type PublicListItemStatus = 'normal' | 'abnormal' | 'over_capacity' | 'complaint';
export type ComplaintStatus = 'pending' | 'merged' | 'resolved';
export type HistoryActionType = 'confirm' | 'reject' | 'merge';

export interface GisPoint {
  id: string;
  originalData: Record<string, any>;
  source: string;
  lat: number;
  lng: number;
  street: string;
  status: GisPointStatus;
  conflictWith?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublicListItem {
  id: string;
  gisPointId: string;
  schoolName: string;
  pickupTime: string;
  capacity: number;
  actualCount: number;
  status: PublicListItemStatus;
  calculationId: string;
  rawData: Record<string, any>;
  remark: string;
  createdAt: string;
}

export interface Complaint {
  id: string;
  listItemId: string;
  street: string;
  content: string;
  reporter: string;
  status: ComplaintStatus;
  mergedInto?: string;
  originalIds?: string;
  createdAt: string;
}

export interface HistoryRecord {
  id: string;
  operator: string;
  actionType: HistoryActionType;
  beforeData: Record<string, any>;
  afterData: Record<string, any>;
  explanation: string;
  createdAt: string;
}

export interface CalculationRule {
  id: string;
  name: string;
  version: string;
  parameters: Record<string, any>;
  algorithm: string;
  effectiveAt: string;
}

export interface ConflictGroup {
  street: string;
  points: GisPoint[];
}

export interface MergeableComplaintGroup {
  key: string;
  street: string;
  listItemId: string;
  complaints: Complaint[];
}

export interface TraceData {
  listItem: PublicListItem;
  gisPoint: GisPoint;
  calculationRule: CalculationRule;
}
