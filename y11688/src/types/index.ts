export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface Position3D {
  x: number;
  y: number;
  z: number;
}

export interface Slope {
  id: string;
  name: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  averageSlope: number;
  heightMap: number[][];
  bounds: [number, number, number, number];
  color: string;
}

export interface SnowData {
  slopeId: string;
  depth: number;
  quality: 'powder' | 'packed' | 'icy' | 'slushy';
  lastUpdated: Date;
  source: string;
}

export interface Trajectory {
  id: string;
  slopeId: string;
  points: Position3D[];
  startTime: Date;
  endTime: Date;
  averageSpeed: number;
  skierId: string;
  source: string;
}

export interface Accident {
  id: string;
  slopeId: string;
  position: Position3D;
  type: 'fall' | 'collision' | 'equipment' | 'medical' | 'other';
  severity: RiskLevel;
  time: Date;
  reporter: string;
  description: string;
  source: string;
}

export interface PatrolReport {
  id: string;
  slopeId: string;
  time: Date;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  snowCondition: string;
  hazards: string[];
  notes: string;
  patrolId: string;
  source: string;
}

export interface ValidationError {
  id: string;
  type: 'color_reversal' | 'trajectory_overlap' | 'accident_missing' | 'data_inconsistency';
  severity: 'warning' | 'error';
  message: string;
  details: string;
  affectedAreas: string[];
  timestamp: Date;
}

export interface DataVersion {
  id: string;
  timestamp: Date;
  source: string;
  changeLog: string;
  dataSnapshot: {
    slopes: Slope[];
    snowData: SnowData[];
    trajectories: Trajectory[];
    accidents: Accident[];
    patrolReports: PatrolReport[];
  };
  createdBy: string;
}

export interface FilterState {
  selectedSlopes: string[];
  slopeRange: [number, number];
  snowDepthRange: [number, number];
  timeRange: [Date, Date];
  riskLevels: RiskLevel[];
  showHeatmap: boolean;
  heatmapOpacity: number;
  showSlopeColors: boolean;
  showRiskMarkers: boolean;
}

export interface SceneState {
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  selectedArea: Slope | null;
  selectedAccident: Accident | null;
  isDetailDrawerOpen: boolean;
}

export interface AreaStats {
  slopeId: string;
  slopeName: string;
  averageSlope: number;
  maxSlope: number;
  minSlope: number;
  averageSnowDepth: number;
  trajectoryCount: number;
  accidentCount: number;
  riskLevel: RiskLevel;
  patrolReportCount: number;
  lastPatrolTime: Date | null;
}

export type ViewMode = 'main' | 'history' | 'compare';
