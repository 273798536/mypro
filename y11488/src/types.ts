export type ShiftType = 'morning' | 'afternoon' | 'night';

export interface MachineShift {
  machineId: string;
  shift: ShiftType;
  shiftDate: string;
  operator?: string;
}

export interface PhotoReference {
  id: string;
  source: string;
  uploadedAt: string;
  uploadedBy: string;
  description?: string;
}

export interface Defect {
  id: string;
  defectType: string;
  description: string;
  severity: 'minor' | 'major' | 'critical';
  quantity: number;
  photos: PhotoReference[];
  firstFoundAt: string;
  lastUpdatedAt: string;
  reworkCount: number;
  mergedFrom: string[];
  mergedInto?: string;
}

export interface InspectionRecord {
  id: string;
  batchId: string;
  productCode: string;
  sampleSize: number;
  totalQuantity: number;
  inspector: string;
  inspectedAt: string;
  machineShift: MachineShift;
  defects: Defect[];
  passRate: number;
  isReworked: boolean;
  originalBatchId?: string;
}

export interface ReworkOrder {
  id: string;
  reworkBatchId: string;
  originalBatchId: string;
  productCode: string;
  reworkType: string;
  reworkQuantity: number;
  reworker: string;
  machineShift: MachineShift;
  startedAt: string;
  completedAt?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  resolvedDefectIds: string[];
  newDefects: Defect[];
  importedAt: string;
}

export interface VerdictHistory {
  id: string;
  defectId: string;
  verdict: 'pass' | 'fail' | 'rework' | 'waived';
  reason: string;
  judgedBy: string;
  judgedAt: string;
  photoSources: string[];
  isCurrent: boolean;
}

export interface YieldRecord {
  id: string;
  machineId: string;
  shift: ShiftType;
  shiftDate: string;
  totalProduced: number;
  totalDefects: number;
  passRate: number;
  calculatedAt: string;
  includedBatchIds: string[];
  deduplicatedDefectIds: string[];
}

export interface Database {
  inspections: InspectionRecord[];
  reworkOrders: ReworkOrder[];
  verdictHistory: VerdictHistory[];
  yieldRecords: YieldRecord[];
  metadata: {
    lastUpdated: string;
    version: number;
  };
}

export type CommandResult<T = void> = {
  success: boolean;
  message: string;
  data?: T;
  warnings?: string[];
};
