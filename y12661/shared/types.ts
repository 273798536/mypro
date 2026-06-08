export type TaskStatus = 'pending' | 'reviewing' | 'passed' | 'conflict';

export type LengthUnit = 'mm' | 'cm' | 'm';
export type WidthUnit = 'mm' | 'cm';
export type DepthUnit = 'mm' | 'cm';

export type MaterialType = 'screenshot' | 'model' | 'time_record';
export type CalibrationStatus = 'calibrated' | 'uncalibrated' | 'conflict';

export interface ReviewTask {
  id: string;
  taskNo: string;
  bridgeName: string;
  bridgeCode: string;
  crackCount: number;
  submitter: string;
  submittedAt: string;
  status: TaskStatus;
  hasBadData: boolean;
}

export interface CrackParams {
  id: string;
  taskId: string;
  crackId: string;
  collectionTime: string;
  processTime: string;
  reviewTime: string;
  lengthValue: number;
  lengthUnit: LengthUnit;
  widthValue: number;
  widthUnit: WidthUnit;
  depthValue: number;
  depthUnit: DepthUnit;
  collisionDetected: boolean;
  overlapMaterialId?: string;
  conclusion: string;
}

export interface ChangeHistory {
  id: string;
  taskId: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  operator: string;
  operatedAt: string;
  reason: string;
  collisionChanged: boolean;
}

export interface MaterialSource {
  id: string;
  taskId: string;
  type: MaterialType;
  name: string;
  sourceFile: string;
  submittedBy: string;
  calibrationStatus: CalibrationStatus;
}

export interface TaskDetail extends ReviewTask {
  params: CrackParams[];
  materials: MaterialSource[];
}

export interface ApiResponse<T> {
  code: number;
  data: T;
  message?: string;
}

export interface ParamUpdatePayload {
  fieldName: string;
  oldValue: string;
  newValue: string;
  operator: string;
  reason: string;
  crackId?: string;
}

export interface CollisionResult {
  detected: boolean;
  overlapMaterialId?: string;
  note: string;
  lengthMm: number;
  widthMm: number;
  depthMm: number;
}

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  pending: '待复核',
  reviewing: '复核中',
  passed: '已通过',
  conflict: '有冲突',
};

export const MATERIAL_TYPE_LABEL: Record<MaterialType, string> = {
  screenshot: '截图',
  model: '三维模型',
  time_record: '时间记录',
};

export const CALIBRATION_LABEL: Record<CalibrationStatus, string> = {
  calibrated: '已校准',
  uncalibrated: '未校准',
  conflict: '口径冲突',
};
