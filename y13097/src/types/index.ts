export interface Point {
  x: number;
  y: number;
}

export type ObjectType =
  | 'building'
  | 'tower'
  | 'mountain'
  | 'power_line'
  | 'other';

export type LayerType =
  | 'corridor'
  | 'buildings'
  | 'towers'
  | 'mountains'
  | 'power_lines'
  | 'annotations';

export interface CollisionObject {
  id: string;
  name: string;
  type: ObjectType;
  layer: LayerType;
  position: Point;
  width: number;
  height: number;
  altitude: number;
  sourceAttachmentId: string;
  isAbnormal: boolean;
  abnormalReason?: string;
}

export interface Corridor {
  id: string;
  name: string;
  waypoints: Point[];
  width: number;
  minAltitude: number;
  maxAltitude: number;
  sourceAttachmentId: string;
}

export type AttachmentType =
  | 'cad_drawing'
  | 'supplement'
  | 'verbal_note'
  | 'official_document';

export interface AttachmentVersion {
  version: number;
  timestamp: string;
  author: string;
  description: string;
  changeSummary: string;
  affectedObjectIds: string[];
}

export interface Attachment {
  id: string;
  name: string;
  type: AttachmentType;
  uploadedAt: string;
  uploadedBy: string;
  isLateArrival: boolean;
  versions: AttachmentVersion[];
  currentVersion: number;
  notes: string;
}

export type CollisionStatus = 'safe' | 'warning' | 'danger' | 'pending';

export interface CollisionResult {
  objectId: string;
  objectName: string;
  status: CollisionStatus;
  overlapDistance: number;
  overlapArea: number;
  altitudeConflict: boolean;
  description: string;
  nextSteps: string[];
}

export interface ViewState {
  id: string;
  name: string;
  zoom: number;
  panX: number;
  panY: number;
  visibleLayers: LayerType[];
  filterStatus: CollisionStatus[];
  selectedObjectId: string | null;
  createdAt: string;
}

export interface PreReviewReport {
  corridorName: string;
  reviewDate: string;
  reviewedBy: string;
  overallStatus: CollisionStatus;
  totalObjects: number;
  dangerCount: number;
  warningCount: number;
  safeCount: number;
  pendingCount: number;
  attachments: Attachment[];
  collisionResults: CollisionResult[];
  viewSnapshot?: ViewState;
  conclusions: string;
}
