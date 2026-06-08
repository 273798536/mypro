export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  blocks: Block[];
  corridors: Corridor[];
  collisions: CollisionRecord[];
  history: HistoryLog[];
  isFirstVisit: boolean;
}

export interface Block {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  size: { width: number; depth: number; height: number };
  color: string;
  type: "building" | "green" | "infrastructure";
}

export interface Corridor {
  id: string;
  name: string;
  width: number;
  height: number;
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
  angle: number;
}

export type CollisionType = "overlap" | "corridor_violation" | "setback_insufficient";
export type Severity = "high" | "medium" | "low";
export type CollisionStatus = "pending" | "reviewed";

export interface CollisionRecord {
  id: string;
  blockA: string;
  blockB: string;
  collisionType: CollisionType;
  severity: Severity;
  coordinates: { x: number; y: number; z: number };
  description: string;
  status: CollisionStatus;
  createdAt: string;
  review?: ReviewLog;
}

export interface ReviewLog {
  id: string;
  reviewer: string;
  reviewedAt: string;
  reason: string;
  opinion: string;
  approved: boolean;
}

export type ActionType =
  | "param_change"
  | "collision_detect"
  | "review"
  | "camera_loss"
  | "project_create";

export interface HistoryLog {
  id: string;
  actionType: ActionType;
  operator: string;
  timestamp: string;
  description: string;
  snapshot: {
    parameters?: Record<string, number>;
    coordinates?: { x: number; y: number; z: number };
    collisionId?: string;
  };
}

export interface ParamExplanation {
  key: string;
  name: string;
  explanation: string;
}

export interface SandboxStore {
  currentProject: Project;
  selectedBlockId: string | null;
  selectedCollisionId: string | null;
  isDetecting: boolean;
  activePanel: "collision" | "history" | "report";
  selectBlock: (id: string | null) => void;
  selectCollision: (id: string | null) => void;
  setActivePanel: (panel: "collision" | "history" | "report") => void;
  updateCorridorParam: (
    id: string,
    key: keyof Corridor,
    value: number
  ) => void;
  updateBlockPosition: (
    id: string,
    position: Partial<Block["position"]>
  ) => void;
  updateBlockSize: (id: string, size: Partial<Block["size"]>) => void;
  runCollisionDetection: () => void;
  reviewCollision: (
    collisionId: string,
    review: Omit<ReviewLog, "id" | "reviewedAt">
  ) => void;
  addHistoryLog: (log: Omit<HistoryLog, "id" | "timestamp">) => void;
  generateReport: () => string;
  loadSampleData: () => void;
  resetProject: () => void;
}
