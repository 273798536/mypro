export type InspectionStatus = 'pending' | 'checking' | 'reviewing' | 'completed';
export type BaseUnit = 'm' | 'cm' | 'mm';
export type MeasurePointStatus = 'normal' | 'abnormal' | 'revised' | 'confirmed';
export type HistoryAction =
  | 'param_update'
  | 'point_add'
  | 'point_delete'
  | 'point_revise'
  | 'conclusion_change'
  | 'review_pass'
  | 'review_reject';
export type HistoryTargetType = 'params' | 'measure_point' | 'conclusion';

export interface Inspection {
  id: string;
  projectName: string;
  garageCode: string;
  scope: string;
  baseUnit: BaseUnit;
  status: InspectionStatus;
  minClearanceRequired: number;
  currentBatchId: string;
  lastEditor: string;
  createdAt: string;
  updatedAt: string;
}

export interface SectionParams {
  id: string;
  inspectionId: string;
  batchId: string;
  beamHeight: number;
  pipeDiameter: number;
  ceilingThickness: number;
  slabThickness: number;
  floorElevation: number;
  updatedAt: string;
}

export interface MeasurePoint {
  id: string;
  inspectionId: string;
  batchId: string;
  sectionLineId: string;
  code: string;
  coordinate: { x: number; y: number; z: number };
  measuredValue: number;
  calculatedClearance: number;
  isAbnormal: boolean;
  screenshotUrl: string;
  status: MeasurePointStatus;
  remark: string;
  handlingOpinion: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChangeHistory {
  id: string;
  inspectionId: string;
  batchId: string;
  operator: string;
  action: HistoryAction;
  targetType: HistoryTargetType;
  targetId: string;
  reason: string;
  beforeValue: Record<string, unknown>;
  afterValue: Record<string, unknown>;
  createdAt: string;
}

export interface InspectionDetail {
  inspection: Inspection;
  params: SectionParams;
  points: MeasurePoint[];
}

export interface BatchCompareResult {
  beforeBatchId: string;
  afterBatchId: string;
  before: {
    params: SectionParams;
    points: MeasurePoint[];
    abnormalCount: number;
  };
  after: {
    params: SectionParams;
    points: MeasurePoint[];
    abnormalCount: number;
  };
  pointDiffs: Array<{
    pointId: string;
    code: string;
    field: string;
    before: unknown;
    after: unknown;
  }>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
