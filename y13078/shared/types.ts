export interface Point {
  id: string;
  x: number;
  y: number;
  cabinetId: string;
  type: 'sensor' | 'outlet' | 'switch' | 'cable';
  status: 'normal' | 'warning' | 'error';
  remark: string;
  originalRow: number | null;
  isBadData: boolean;
  badDataReason?: string;
  withdrawn: boolean;
  withdrawalInfo?: {
    reason: string;
    operator: string;
    timestamp: number;
  };
  supplements: SupplementNote[];
  createdAt: number;
  updatedAt: number;
}

export interface SupplementNote {
  id: string;
  content: string;
  operator: string;
  timestamp: number;
}

export interface ViewPreset {
  id: string;
  name: string;
  thumbnail: string;
  zoom: number;
  panX: number;
  panY: number;
  filters: FilterState;
  createdAt: number;
}

export interface FilterState {
  regions: string[];
  types: Point['type'][];
  statuses: Point['status'][];
  showWithdrawn: boolean;
  showSupplements: boolean;
}

export interface OverlapPair {
  pointIds: [string, string];
  distance: number;
  threshold: number;
  severity: 'high' | 'medium' | 'low';
}

export interface UnifiedSummary {
  annotationSummary: string;
  sidebarSummary: string;
  reportSummary: string;
  talkingPoints: string[];
  timestamp: number;
}

export type UpdateRemarkRequest = { remark: string; operator: string };
export type UpdateRemarkResponse = Point;

export type CreateViewRequest = Omit<ViewPreset, 'id' | 'createdAt'>;
export type CreateViewResponse = ViewPreset;

export type DetectOverlapsResponse = {
  pairs: OverlapPair[];
  totalPoints: number;
  checkedAt: number;
};

export type WithdrawRequest = { reason: string; operator: string };
export type SupplementRequest = { content: string; operator: string };
export type BadDataRequest = { reason: string; originalRow: number };

export interface Cabinet {
  id: string;
  region: 'A' | 'B' | 'C';
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
}
