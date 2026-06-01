export type CrackStatus = 'normal' | 'duplicate' | 'missing_field' | 'late_added';

export type RiskLevel = 'low' | 'medium' | 'high';

export type DataGapType = 'rainfall' | 'coords' | 'other';

export type ActionType = 'create' | 'update' | 'delete';

export interface CrackPoint {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  length: number;
  width: number;
  status: CrackStatus;
  riskLevel: RiskLevel;
  remark: string;
  rainfall?: string;
  residentCoords?: string;
  createTime: string;
  updateTime: string;
  isDuplicate: boolean;
  duplicateOf?: string;
}

export interface HistoryRecord {
  id: string;
  crackId: string;
  action: ActionType;
  field?: string;
  oldValue?: string;
  newValue?: string;
  operator: string;
  timestamp: string;
  remark?: string;
}

export interface DataGap {
  id: string;
  type: DataGapType;
  description: string;
  crackId?: string;
  affects3D: boolean;
}

export interface RiskReport {
  id: string;
  generateTime: string;
  totalCracks: number;
  duplicateCount: number;
  missingFieldCount: number;
  lateAddedCount: number;
  content: string;
}

export interface AppState {
  cracks: CrackPoint[];
  selectedCrack: CrackPoint | null;
  history: HistoryRecord[];
  dataGaps: DataGap[];
  reports: RiskReport[];
  originalCracks: CrackPoint[];
  editingCrack: CrackPoint | null;
}
