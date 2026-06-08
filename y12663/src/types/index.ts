export type GameStatus = "idle" | "running" | "paused" | "settled";

export interface GameStats {
  totalRecords: number;
  overrunCount: number;
  duplicateBlocked: number;
  exportedCount: number;
}

export interface GameStateShape {
  roundId: string | null;
  status: GameStatus;
  startedAt: number | null;
  lastPausedAt: number | null;
  accumulatedMs: number;
  stats: GameStats;
  selectedPlaneId: string | null;
  selectedConclusionId: string | null;
  cameraFocus: { position: [number, number, number]; target: [number, number, number] } | null;
}

export type NormalAxis = "X" | "Y" | "Z";
export type SectionStatus = "normal" | "overrun" | "resolved";

export interface SunlightDataset {
  id: string;
  fileName: string;
  contentHash: string;
  importedAt: number;
  buildingName: string;
  importSource: string;
}

export interface BuildingBlock {
  id: string;
  datasetId: string;
  name: string;
  position: [number, number, number];
  size: [number, number, number];
}

export interface SectionPlane {
  id: string;
  datasetId: string;
  index: number;
  normalAxis: NormalAxis;
  position: number;
  status: SectionStatus;
  overrunNote?: string;
  resolutionNote?: string;
}

export interface SectionConclusion {
  id: string;
  planeId: string;
  content: string;
  generatedAt: number;
  operator: string;
  isLinkedTo3D: boolean;
}

export type OperationType =
  | "import"
  | "select_plane"
  | "mark_overrun"
  | "resolve_overrun"
  | "export_screenshot"
  | "link_conclusion"
  | "start_round"
  | "pause_round"
  | "resume_round"
  | "settle_round";

export interface OperationLog {
  id: string;
  roundId: string;
  type: OperationType;
  targetId: string;
  timestamp: number;
  detail: Record<string, unknown>;
  cameraSnapshot: {
    position: [number, number, number];
    target: [number, number, number];
  };
}

export interface TraceChain {
  id: string;
  planeId: string;
  sourceDataset: string;
  importTime: number;
  operatorName: string;
  correctionAction: string;
  conclusionId: string;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingDataset?: SunlightDataset;
  diffSummary?: string[];
  contentHash: string;
}

export type DedupStrategy = "skip" | "overwrite" | "merge";
