import { 
  CollisionType, 
  CollisionSeverity 
} from "../entity/Collision";
import { 
  HistoryAction 
} from "../entity/ReviewHistory";
import { 
  ViewAngle 
} from "../entity/ViewConfig";
import { 
  RemarkSource 
} from "../entity/Remark";
import { 
  ReviewStatus, 
  ReviewConclusion 
} from "../entity/Review";

export interface CreateReviewDto {
  name: string;
  description?: string;
  operatorRemark?: string;
}

export interface UpdateReviewDto {
  name?: string;
  description?: string;
  operatorRemark?: string;
  status?: ReviewStatus;
  conclusion?: ReviewConclusion;
  isGrayRelease?: boolean;
}

export interface AddCadLayerDto {
  name: string;
  version: string;
  layerType?: string;
  filePath?: string;
}

export interface AddMaterialDto {
  name: string;
  standardName?: string;
  unit: string;
  quantity: number;
  floor?: string;
}

export interface AddRemarkDto {
  content: string;
  source?: RemarkSource;
  author?: string;
  relatedCollisionId?: string;
}

export interface ConfirmCollisionDto {
  isConfirmed: boolean;
  confirmedBy?: string;
  impactOnConclusion?: string;
}

export interface AddViewConfigDto {
  name: string;
  angle?: ViewAngle;
  zoom?: number;
  rotationX?: number;
  rotationY?: number;
  panX?: number;
  panY?: number;
  screenshotPath?: string;
  collisionId?: string;
  description?: string;
}

export interface DetectionResult {
  type: CollisionType;
  severity: CollisionSeverity;
  description: string;
  location?: string;
  impactOnConclusion: string;
  sourceId?: string;
  sourceType?: string;
}

export interface ExportOptions {
  format: "pdf" | "excel" | "csv";
  includeHistory?: boolean;
  includeCollisions?: boolean;
  includeScreenshots?: boolean;
}

export interface GuideItem {
  title: string;
  content: string;
  type: "example" | "exception" | "export";
  order: number;
}
