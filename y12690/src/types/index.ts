export type Vec3 = [number, number, number];

export type Unit = 'mm' | 'cm' | 'm';

export type RecordStatus = 'valid' | 'needs_review' | 'invalid';

export type CollisionType = 'collision' | 'boundary' | 'warning';

export interface Viewpoint {
  id: string;
  name: string;
  position: Vec3;
  rotation: Vec3;
  fov: number;
  createdAt: number;
  screenshot?: string;
  description?: string;
}

export interface Collision {
  id: string;
  type: CollisionType;
  description: string;
  position: Vec3;
  colorCode: string;
  isCritical: boolean;
  relatedElements: string[];
  unit: Unit;
}

export interface PipeElement {
  id: string;
  name: string;
  type: 'pipe' | 'support' | 'beam' | 'flange' | 'valve';
  position: Vec3;
  size: Vec3;
  coordinateSystem?: string;
  unit: Unit;
  notes?: string;
  isEmpty?: boolean;
  isDuplicate?: boolean;
  rawNotes?: string;
}

export interface InspectionRecord {
  id: string;
  name: string;
  status: RecordStatus;
  createdAt: number;
  hasDuplicates: boolean;
  hasEmptyValues: boolean;
  hasCoordinateIssues: boolean;
  hasUnitMismatch: boolean;
  viewpoints: Viewpoint[];
  collisions: Collision[];
  elements: PipeElement[];
  modelSource: string;
  reviewer?: string;
  reviewNotes?: string;
  timeParams: {
    designTime: number;
    importTime: number;
    exportTime?: number;
    timelineSync: boolean;
  };
}

export interface ValidationIssue {
  type: 'empty' | 'duplicate' | 'coordinate' | 'unit' | 'note_mixed';
  elementIds: string[];
  description: string;
  severity: 'critical' | 'warning';
}

export interface ScreenshotItem {
  id: string;
  viewpointId: string;
  name: string;
  timestamp: number;
  dataUrl?: string;
}
