export type GeometryType =
  | 'cube'
  | 'pyramid'
  | 'cylinder'
  | 'cone'
  | 'sphere'
  | 'prism'
  | 'tetrahedron';

export type AxisType = 'x' | 'y' | 'z' | 'custom';

export type ToolMode = 'select' | 'rotate' | 'section' | 'annotate' | 'move';

export type RecordType = 'normal' | 'boundary' | 'error';

export type ValidationErrorType =
  | 'section_missing'
  | 'angle_out_of_bounds'
  | 'annotation_misplaced'
  | 'axis_invalid'
  | 'geometry_invalid';

export type Severity = 'error' | 'warning';

export interface GeometryObject {
  id: string;
  type: GeometryType;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
  opacity: number;
  visible: boolean;
  name?: string;
}

export interface RotationAxis {
  id: string;
  type: AxisType;
  startPoint: [number, number, number];
  endPoint: [number, number, number];
  visible: boolean;
  draggable: boolean;
  color: string;
}

export interface SectionPlane {
  id: string;
  position: [number, number, number];
  normal: [number, number, number];
  visible: boolean;
  showIntersection: boolean;
  intersectionColor: string;
  planeColor: string;
}

export interface AnnotationPoint {
  id: string;
  position: [number, number, number];
  label: string;
  color: string;
  connectedTo?: string;
  visible: boolean;
}

export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
}

export interface SceneState {
  geometries: GeometryObject[];
  rotationAxes: RotationAxis[];
  sectionPlanes: SectionPlane[];
  annotations: AnnotationPoint[];
  camera: CameraState;
}

export interface ProblemStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  sceneSnapshot: SceneState;
  isActive: boolean;
}

export interface RevisionEntry {
  timestamp: string;
  userId: string;
  action: string;
  description: string;
  previousState?: SceneState;
}

export interface ScenarioRecord {
  id: string;
  name: string;
  description: string;
  type: RecordType;
  createdAt: string;
  modifiedAt: string;
  scene: SceneState;
  steps: ProblemStep[];
  revisionHistory: RevisionEntry[];
  source?: string;
}

export interface ValidationError {
  type: ValidationErrorType;
  severity: Severity;
  message: string;
  objectId?: string;
  suggestion: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export interface AppState {
  currentScenario: ScenarioRecord | null;
  activeStepId: string | null;
  selectedObjectId: string | null;
  toolMode: ToolMode;
  validationResult: ValidationResult | null;
  isLoading: boolean;
}
