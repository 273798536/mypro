export interface DHParameter {
  a: number;
  alpha: number;
  d: number;
  theta: number;
}

export interface JointConfig {
  jointAngles: number[];
  jointLimits: Array<{ min: number; max: number }>;
  linkLengths: number[];
  dhParameters: DHParameter[];
}

export type PointStatus =
  | 'reachable'
  | 'collision'
  | 'singularity'
  | 'joint_limit'
  | 'out_of_workspace';

export type ConflictType = 'joint_limit' | 'collision' | 'singularity';

export interface ConflictSource {
  type: ConflictType;
  jointIndex?: number;
  obstacleId?: string;
  details: string;
  severity: 'warning' | 'error';
}

export interface SamplePoint {
  id: string;
  jointAngles: number[];
  cartesianPosition: [number, number, number];
  cartesianOrientation: [number, number, number, number];
  status: PointStatus;
  conflictSources: ConflictSource[];
  manipulability: number;
  distanceToObstacle: number;
  timestamp: number;
}

export interface Obstacle {
  id: string;
  type: 'box' | 'sphere' | 'cylinder' | 'mesh';
  position: [number, number, number];
  size: [number, number, number];
  rotation: [number, number, number];
  color: string;
}

export interface WorkspaceResult {
  id: string;
  samplePoints: SamplePoint[];
  jointConfig: JointConfig;
  obstacles: Obstacle[];
  statistics: {
    total: number;
    reachable: number;
    collision: number;
    singularity: number;
    jointLimit: number;
  };
  createdAt: number;
}

export interface DiffResult {
  added: string[];
  removed: string[];
  changed: string[];
  beforeId: string;
  afterId: string;
}

export interface FilterOptions {
  status: PointStatus[];
  jointIndices: number[];
  conflictTypes: ConflictType[];
  manipulabilityRange: [number, number];
}

export interface AppState {
  currentJointConfig: JointConfig;
  workspaceResult: WorkspaceResult | null;
  previousResult: WorkspaceResult | null;
  diffResult: DiffResult | null;
  obstacles: Obstacle[];
  filters: FilterOptions;
  selectedPointId: string | null;
  hoveredPointId: string | null;
  isComputing: boolean;
  showDiff: boolean;
  sampleResolution: number;
}

export interface JointTransform {
  position: [number, number, number];
  rotation: [number, number, number, number];
}
