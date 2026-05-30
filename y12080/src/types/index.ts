export type Vec3 = [number, number, number];

export interface StageModel {
  id: string;
  name: string;
  width: number;
  depth: number;
  height: number;
  obstacles: Obstacle[];
  createdAt: number;
}

export interface Obstacle {
  id: string;
  name: string;
  position: Vec3;
  size: Vec3;
  type: 'wall' | 'prop' | 'scenery';
}

export type LightType = 'spot' | 'fresnel' | 'par' | 'led';
export type LightStatus = 'normal' | 'pending' | 'conflict';

export interface Light {
  id: string;
  name: string;
  type: LightType;
  position: Vec3;
  target: Vec3;
  angle: number;
  intensity: number;
  color: string;
  penumbra: number;
  status: LightStatus;
}

export interface ActorRoute {
  id: string;
  actorName: string;
  color: string;
  points: RoutePoint[];
  duration: number;
}

export interface RoutePoint {
  id: string;
  position: Vec3;
  time: number;
  paragraph?: string;
}

export type ResultType = 'light_conflict' | 'route_occlusion' | 'paragraph_mismatch';
export type ResultSeverity = 'warning' | 'error';
export type ResultStatus = 'pending' | 'confirmed' | 'resolved';

export interface DetectionResult {
  id: string;
  type: ResultType;
  severity: ResultSeverity;
  status: ResultStatus;
  description: string;
  assignee?: string;
  relatedLightIds?: string[];
  relatedRouteIds?: string[];
  relatedObstacleIds?: string[];
  position?: Vec3;
  createdAt: number;
  notes?: string;
}

export interface Snapshot {
  stage: StageModel;
  lights: Light[];
  routes: ActorRoute[];
  results: DetectionResult[];
}

export interface VersionRecord {
  id: string;
  timestamp: number;
  description: string;
  modifiedFields: string[];
  previousState: Snapshot;
  currentState: Snapshot;
  conclusionsOverturned: string[];
}

export interface SmokeConfig {
  enabled: boolean;
  density: number;
  color: string;
  height: number;
}

export type ViewMode = 'perspective' | 'front' | 'side' | 'top';

export interface OcclusionSegment {
  startIndex: number;
  endIndex: number;
  occlusionRate: number;
  blockedBy: string[];
}
