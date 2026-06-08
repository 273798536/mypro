export type GameStatus = 'ready' | 'playing' | 'paused' | 'finished' | 'reviewing';

export interface SectionPlane {
  id: string;
  name: string;
  axis: 'x' | 'y' | 'z';
  position: number;
  color: string;
  enabled: boolean;
  createdAt: number;
}

export interface ScreenshotRecord {
  id: string;
  name: string;
  dataUrl: string;
  timestamp: number;
  sectionPlanes: SectionPlane[];
  cameraPosition: { x: number; y: number; z: number };
  needsReview: boolean;
  linkedConclusionIds: string[];
}

export interface Conclusion {
  id: string;
  text: string;
  sourceSectionId: string | null;
  sourceMeasurementId: string | null;
  canUseDirectly: boolean;
  reviewReason?: string;
  createdAt: number;
}

export interface MeasurementRecord {
  id: string;
  name: string;
  source: string;
  position: { x: number; y: number; z: number };
  value: number;
  unit: string;
  timestamp: number;
}

export interface CollisionEvent {
  id: string;
  timestamp: number;
  type: 'section_out_of_bounds' | 'duplicate_import' | 'missing_measurement' | 'data_inconsistency';
  message: string;
  actionableHint: string;
  resolved: boolean;
}

export interface GameState {
  status: GameStatus;
  elapsedMs: number;
  bleachingProgress: number;
  sectionPlanes: SectionPlane[];
  screenshots: ScreenshotRecord[];
  conclusions: Conclusion[];
  measurements: MeasurementRecord[];
  collisions: CollisionEvent[];
  importCount: number;
  activeConclusionId: string | null;
  activeSectionId: string | null;
}

export interface Bounds3D {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}
