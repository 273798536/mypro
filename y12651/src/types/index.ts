export interface Point3D {
  id: string;
  x: number;
  y: number;
  z: number;
  intensity: number;
  isOutlier: boolean;
  originalFrame: number;
}

export type SyncStatus = 'synced' | 'delayed' | 'skipped' | 'offset';

export interface FrameData {
  frameIndex: number;
  timestamp: number;
  points: Point3D[];
  syncStatus: SyncStatus;
  syncOffsetMs?: number;
}

export interface SectionParams {
  positionX: number;
  positionY: number;
  positionZ: number;
  normalX: number;
  normalY: number;
  normalZ: number;
  thickness: number;
  timeOffset: number;
}

export interface ParamSnapshot {
  params: SectionParams;
  timestamp: number;
  operator: string;
  reason?: string;
  sectionResult?: SectionResult;
}

export type OutlierStatus = 'pending' | 'approved' | 'rejected';

export interface OutlierMark {
  id: string;
  pointId: string;
  status: OutlierStatus;
  markedBy: string;
  markedAt: number;
  reviewedBy?: string;
  reviewedAt?: number;
  reviewReason?: string;
  pointSnapshot?: Point3D;
}

export type AuditAction =
  | 'param_change'
  | 'outlier_mark'
  | 'outlier_approve'
  | 'outlier_reject'
  | 'frame_skip'
  | 'sync_fix'
  | 'game_start'
  | 'game_pause'
  | 'game_finish';

export type UserRole = 'operator' | 'reviewer' | 'observer';

export interface AuditLog {
  id: string;
  action: AuditAction;
  operator: string;
  role: UserRole;
  timestamp: number;
  reason: string;
  beforeValue: Record<string, unknown>;
  afterValue: Record<string, unknown>;
}

export type GameStatus = 'idle' | 'playing' | 'paused' | 'finished';
export type GameResult = 'correct' | 'wrong' | null;

export interface SectionResult {
  pointCount: number;
  outlierCount: number;
  crossSectionArea: number;
  centroid: { x: number; y: number; z: number };
  boundingBox: {
    minX: number; maxX: number;
    minY: number; maxY: number;
    minZ: number; maxZ: number;
  };
}

export interface GameSession {
  id: string;
  status: GameStatus;
  currentFrame: number;
  totalFrames: number;
  startTime: number | null;
  endTime: number | null;
  result: GameResult;
  playSpeed: number;
  currentRole: UserRole;
  currentParams: SectionParams;
  paramHistory: ParamSnapshot[];
  outlierMarks: OutlierMark[];
  auditLogs: AuditLog[];
  frames: FrameData[];
  activeBoundaryScene: BoundaryScene | null;
  detectedSyncIssues: string[];
}

export type BoundaryType = 'delay' | 'skip' | 'offset';

export interface BoundaryScene {
  id: string;
  name: string;
  description: string;
  triggerFrame: number;
  type: BoundaryType;
  expectedFix: Partial<SectionParams>;
  consequence: string;
  changesResult: boolean;
}

export interface UserInfo {
  name: string;
  role: UserRole;
  avatar: string;
}
