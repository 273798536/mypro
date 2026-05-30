export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface PackageFile {
  id: string;
  name: string;
  type: 'model' | 'report' | 'record';
  size: number;
  uploadTime: number;
  content?: string;
}

export interface DataPackage {
  id: string;
  name: string;
  patientId: string;
  patientName?: string;
  createdAt: number;
  updatedAt: number;
  files: PackageFile[];
  status: 'pending' | 'analyzing' | 'completed' | 'error';
}

export interface Annotation {
  id: string;
  position: Vector3;
  label: string;
  description: string;
  arrowFrom?: Vector3;
  color: string;
}

export interface ContactPoint {
  id: string;
  position: Vector3;
  normal: Vector3;
  pressure: number;
  area: number;
  type: 'normal' | 'misaligned' | 'grinding' | 'conflict';
  annotation?: Annotation;
  jaw: 'upper' | 'lower';
  toothNumber?: number;
}

export interface Malocclusion {
  id: string;
  type: 'horizontal' | 'vertical' | 'rotational';
  direction: Vector3;
  distance: number;
  affectedTeeth: number[];
  annotation: Annotation;
  severity: 'mild' | 'moderate' | 'severe';
}

export interface GrindingArea {
  id: string;
  center: Vector3;
  depth: number;
  area: number;
  isExcessive: boolean;
  annotation: Annotation;
  toothNumber?: number;
}

export interface EvidenceLink {
  id: string;
  resultItemId: string;
  sourceType: 'model' | 'report' | 'record';
  sourceFile: string;
  sourceLocation: string;
  sourceContent: string;
}

export interface AnalysisResult {
  id: string;
  packageId: string;
  createdAt: number;
  hash: string;
  contactPoints: ContactPoint[];
  malocclusions: Malocclusion[];
  grindingAreas: GrindingArea[];
  confidence: number;
  isComplexCase: boolean;
  evidenceLinks: EvidenceLink[];
  notes?: string;
}

export interface TeethModelData {
  upperJaw: {
    vertices: number[];
    indices: number[];
    normals: number[];
  };
  lowerJaw: {
    vertices: number[];
    indices: number[];
    normals: number[];
  };
}

export type ViewMode = 'combined' | 'upper' | 'lower' | 'exploded';
export type CameraMode = 'orthographic' | 'perspective';

export interface AnalysisState {
  showContactPoints: boolean;
  showMalocclusions: boolean;
  showGrindingAreas: boolean;
  showAnnotations: boolean;
  viewMode: ViewMode;
  cameraMode: CameraMode;
  selectedItemId?: string;
}
