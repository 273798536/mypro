export type ReviewStatus = "pending" | "processing" | "completed" | "has_issues";
export type ReviewConclusion = "pass" | "fail" | "pending";
export type CollisionType = 
  | "old_cad_layer" 
  | "material_name_mismatch" 
  | "unit_mixed" 
  | "floor_unit_mismatch"
  | "verbal_remark"
  | "other";
export type CollisionSeverity = "high" | "medium" | "low";
export type HistoryAction = 
  | "create" 
  | "update" 
  | "confirm_collision" 
  | "update_remark" 
  | "export"
  | "status_change"
  | "conclusion_change";
export type ViewAngle = "top" | "front" | "side" | "isometric" | "custom";
export type RemarkSource = "verbal" | "written" | "operator";

export interface Review {
  id: string;
  name: string;
  code: string;
  status: ReviewStatus;
  conclusion: ReviewConclusion;
  operatorRemark?: string;
  description?: string;
  isGrayRelease: boolean;
  cadLayers: CadLayer[];
  materials: Material[];
  collisions: Collision[];
  histories: ReviewHistory[];
  viewConfigs: ViewConfig[];
  remarks: Remark[];
  createdAt: string;
  updatedAt: string;
}

export interface CadLayer {
  id: string;
  name: string;
  version: string;
  isOldVersion: boolean;
  filePath?: string;
  layerType?: string;
  issueDescription?: string;
  reviewId: string;
}

export interface Material {
  id: string;
  name: string;
  standardName?: string;
  unit: string;
  quantity: number;
  isNameMismatch: boolean;
  isUnitMixed: boolean;
  issueDescription?: string;
  floor?: string;
  reviewId: string;
}

export interface Collision {
  id: string;
  type: CollisionType;
  severity: CollisionSeverity;
  location?: string;
  description: string;
  impactOnConclusion?: string;
  isConfirmed: boolean;
  confirmedBy?: string;
  sourceId?: string;
  sourceType?: string;
  reviewId: string;
  createdAt: string;
}

export interface ReviewHistory {
  id: string;
  action: HistoryAction;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  operator?: string;
  description?: string;
  reviewId: string;
  createdAt: string;
}

export interface ViewConfig {
  id: string;
  name: string;
  angle: ViewAngle;
  zoom: number;
  rotationX: number;
  rotationY: number;
  panX: number;
  panY: number;
  screenshotPath?: string;
  collisionId?: string;
  description?: string;
  reviewId: string;
  createdAt: string;
}

export interface Remark {
  id: string;
  content: string;
  source: RemarkSource;
  author?: string;
  relatedCollisionId?: string;
  reviewId: string;
  createdAt: string;
}

export interface GuideItem {
  title: string;
  content: string;
  type: "example" | "exception" | "export";
  order: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface DetectionResult {
  detections: Collision[];
  conclusion: ReviewConclusion;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

export const statusTextMap: Record<ReviewStatus, string> = {
  pending: "待处理",
  processing: "处理中",
  completed: "已完成",
  has_issues: "存在问题"
};

export const conclusionTextMap: Record<ReviewConclusion, string> = {
  pass: "通过",
  fail: "不通过",
  pending: "待判定"
};

export const collisionTypeTextMap: Record<CollisionType, string> = {
  old_cad_layer: "旧版CAD图层",
  material_name_mismatch: "材料名称不一致",
  unit_mixed: "单位混用",
  floor_unit_mismatch: "楼层格式不统一",
  verbal_remark: "口头备注",
  other: "其他"
};

export const severityTextMap: Record<CollisionSeverity, string> = {
  high: "高",
  medium: "中",
  low: "低"
};

export const severityColorMap: Record<CollisionSeverity, string> = {
  high: "red",
  medium: "orange",
  low: "blue"
};

export const actionTextMap: Record<HistoryAction, string> = {
  create: "创建预审",
  update: "更新信息",
  confirm_collision: "确认异常",
  update_remark: "更新备注",
  export: "导出结果",
  status_change: "状态变更",
  conclusion_change: "结论变更"
};
