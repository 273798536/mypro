export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export type PoleDirection = 'N' | 'S';

export type EditorSource = 'position-editor' | 'pole-editor' | 'user';

export interface MagnetConfig {
  id: string;
  position: Vector3;
  poleDirection: PoleDirection;
  rotation: Vector3;
  strength: number;
  lastModifiedBy: EditorSource;
  lastModifiedAt: number;
}

export interface FieldLineParams {
  sampleDensity: number;
  maxFieldStrength: number;
  lineCount: number;
  maxLength: number;
}

export type ConflictType = 'position-vs-pole' | 'density-vs-performance' | 'strength-vs-stability';

export interface ConfigConflict {
  id: string;
  type: ConflictType;
  magnetId?: string;
  description: string;
  sideA: { source: string; value: any; timestamp: number };
  sideB: { source: string; value: any; timestamp: number };
  resolved: boolean;
  resolution?: 'keep-A' | 'keep-B' | 'merge';
}

export type IssueType = 'pole-reverse-failed' | 'sample-too-dense' | 'field-explosion';

export interface IssueReport {
  id: string;
  type: IssueType;
  title: string;
  plainTextExplanation: string;
  technicalDetails: string;
  solution: string;
  relatedRecords: string[];
}

export interface HistoryRecord {
  id: string;
  action: string;
  oldConfig?: Partial<MagnetConfig>;
  newConfig?: Partial<MagnetConfig>;
  timestamp: number;
  userId?: string;
}

export interface InteractionState {
  isDragging: boolean;
  isPaused: boolean;
  isPlaying: boolean;
  currentTime: number;
  dragTarget: string | null;
}
