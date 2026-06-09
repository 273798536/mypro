export interface Pore {
  id: string;
  x: number;
  y: number;
  z: number;
  radius: number;
}

export interface Outlier {
  id: string;
  x: number;
  y: number;
  z: number;
  reason: string;
  measurementRecordId: string;
}

export interface MeasurementRecord {
  id: string;
  sourceTableName: string;
  sourceLineNumber: number;
  sourceImageName: string;
  remark: string;
  x: number;
  y: number;
  z: number;
}

export type CutAxis = "x" | "y" | "z";

export type JudgmentType = "safe" | "review" | "error";

export interface Scene {
  id: string;
  name: string;
  difficulty: "入门" | "进阶" | "挑战";
  description: string;
  isDuplicateTest: boolean;
  pores: Pore[];
  outliers: Outlier[];
  measurements: MeasurementRecord[];
  boundary: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  };
  targetJudgments: number;
}

export interface Session {
  id: string;
  sceneId: string;
  startTime: number;
  endTime: number | null;
  score: number;
  accuracy: number;
  status: "playing" | "paused" | "completed";
}

export interface Judgment {
  id: string;
  sessionId: string;
  type: JudgmentType;
  cutAxis: CutAxis;
  cutValue: number;
  isBoundaryCrossed: boolean;
  crossDistance: number;
  measurementRecordId: string | null;
  comment: string;
  timestamp: number;
}

export interface ScreenshotExport {
  id: string;
  sessionId: string;
  judgmentId: string | null;
  dataUrl: string;
  traceInfo: string;
}

export interface CutPlaneState {
  x: number;
  y: number;
  z: number;
  activeAxis: CutAxis;
}

export interface CollisionResult {
  isCrossed: boolean;
  crossedPores: string[];
  crossedOutliers: string[];
  distance: number;
  nearestBoundary: number;
}
